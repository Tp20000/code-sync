import { useEffect, useRef, useState } from "react"
import { Socket } from "socket.io-client"

type Participant = { socketId: string; username?: string }

export default function useVideoCall({
  socket,
  roomId,
  user,
}: {
  socket: Socket | null
  roomId: string
  user?: { username?: string; socketId?: string }
}) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideosRef = useRef<HTMLDivElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({})
  const [participants, setParticipants] = useState<Participant[]>([])
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [callActiveUsers, setCallActiveUsers] = useState<string[]>([])


  const createPeerConnection = (remoteSocketId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })

    pcsRef.current[remoteSocketId] = pc

    // add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!))
    }

    pc.onicecandidate = (evt) => {
      if (evt.candidate && socket) {
        socket.emit("video:ice", {
          to: remoteSocketId,
          from: socket.id,
          candidate: evt.candidate,
        })
      }
    }

    pc.ontrack = (evt) => {
      const stream = evt.streams && evt.streams[0]
      if (!stream) return
      if (remoteVideosRef.current) {
        let videoEl = remoteVideosRef.current.querySelector<HTMLVideoElement>(`video[data-peer='${remoteSocketId}']`)
        if (!videoEl) {
          videoEl = document.createElement("video")
          videoEl.setAttribute("data-peer", remoteSocketId)
          videoEl.autoplay = true
          videoEl.playsInline = true
          videoEl.controls = false
          videoEl.className = "w-64 h-48 object-cover rounded"
          remoteVideosRef.current.appendChild(videoEl)
        }
        // attach stream
        videoEl.srcObject = stream
      }
    }

    return pc
  }

  const removePeer = (remoteSocketId: string) => {
    const pc = pcsRef.current[remoteSocketId]
    if (pc) {
      try { pc.close() } catch (e) {}
      delete pcsRef.current[remoteSocketId]
    }
    if (remoteVideosRef.current) {
      const el = remoteVideosRef.current.querySelector(`video[data-peer='${remoteSocketId}']`)
      if (el && el.parentNode) el.parentNode.removeChild(el)
    }
  }

  const joinCall = async () => {
    if (!socket) throw new Error("Socket not available")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      socket.emit("video:join", { roomId, user })
      setJoined(true)
    } catch (err) {
      console.error("Failed to get media:", err)
    }
  }

  const leaveCall = () => {
    if (!socket) return
    socket.emit("video:leave", { roomId })
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop() } catch (e) {}
      })
      localStreamRef.current = null
    }
    Object.keys(pcsRef.current).forEach(removePeer)
    if (remoteVideosRef.current) remoteVideosRef.current.innerHTML = ""
    setParticipants([])
    setJoined(false)
  }

  const toggleMute = () => {
    if (!localStreamRef.current) return setMuted((m) => !m)
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled))
    setMuted((m) => !m)
  }

  const toggleCamera = () => {
    if (!localStreamRef.current) return setCameraOff((c) => !c)
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled))
    setCameraOff((c) => !c)
  }

  useEffect(() => {
    if (!socket) return

    socket.on("video:users", ({ participants: serverParticipants }: any) => {
      // serverParticipants expected [{socketId, username},...]
      const arr = (serverParticipants || []).map((p: any) =>
        typeof p === "string" ? { socketId: p } : p
      )
      setParticipants(arr)

      // for each existing participant except me, create pc and send offer
      arr.forEach((p: Participant) => {
        if (p.socketId === socket.id) return
        if (pcsRef.current[p.socketId]) return
        const pc = createPeerConnection(p.socketId)
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => {
            socket.emit("video:offer", {
              to: p.socketId,
              from: socket.id,
              offer: pc.localDescription,
            })
          }))
          .catch(console.error)
      })
    
    })

    socket.on("video:user-joined", ({ socketId, username }: any) => {
      setParticipants((prev) => {
        if (!prev.find((x) => x.socketId === socketId)) {
          return [...prev, { socketId, username }]
        }
        return prev
      })
    
      if (socketId === socket.id) return
      if (!pcsRef.current[socketId]) {
        const pc = createPeerConnection(socketId)
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => {
            socket.emit("video:offer", {
              to: socketId,
              from: socket.id,
              offer: pc.localDescription,
            })
          }))
          .catch(console.error)
      }
    })

    socket.on("video:user-left", ({ socketId }: any) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId))
      removePeer(socketId)
    })

    socket.on("video:offer", async ({ from, offer }: any) => {
      if (!socket) return
      if (!pcsRef.current[from]) createPeerConnection(from)
      const pc = pcsRef.current[from]
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit("video:answer", { to: from, from: socket.id, answer: pc.localDescription })
    })

    socket.on("video:answer", async ({ from, answer }: any) => {
      const pc = pcsRef.current[from]
      if (!pc) return
      await pc.setRemoteDescription(answer)
    })

    socket.on("video:ice", async ({ from, candidate }: any) => {
      const pc = pcsRef.current[from]
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(candidate)
        } catch (err) {
          console.warn("Failed to add ICE candidate", err)
        }
      }
    })
    socket.on("video:status", ({ users }) => {
      setCallActiveUsers(users || [])
    })
    

    return () => {
      socket.off("video:users")
      socket.off("video:user-joined")
      socket.off("video:user-left")
      socket.off("video:offer")
      socket.off("video:answer")
      socket.off("video:ice")
      socket.off("video:status")

    }
  }, [socket])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      leaveCall()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    localVideoRef,
    remoteVideosRef,
    participants,
    callActiveUsers,
    joined,
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    muted,
    cameraOff,
  }
  
  
}
