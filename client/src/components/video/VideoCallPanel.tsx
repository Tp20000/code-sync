import React from "react"
import useVideoCall from "@/hooks/useVideoCall"
import { useSocket } from "@/context/SocketContext"

type VideoCallPanelProps = {
  roomId: string
  user: {
    username: string
    socketId?: string
  }
}

const VideoCallPanel: React.FC<VideoCallPanelProps> = ({ roomId, user }) => {
  const { socket } = useSocket()

  const {
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
  } = useVideoCall({ socket, roomId, user })

  return (
    <div className="flex h-full min-h-[300px] gap-4">
      {/* LEFT: VIDEO AREA */}
      <div className="flex-1 flex flex-col gap-2">
        {/* CONTROLS */}
        <div className="flex gap-2">
          {!joined && (
            <button onClick={joinCall} className="btn-primary">
              Start / Join Call
            </button>
          )}

          {joined && (
            <>
              <button onClick={toggleMute} className="btn-secondary">
                {muted ? "Unmute" : "Mute"}
              </button>

              <button onClick={toggleCamera} className="btn-secondary">
                {cameraOff ? "Turn Camera On" : "Turn Camera Off"}
              </button>

              <button onClick={leaveCall} className="btn-danger">
                Leave Call
              </button>
            </>
          )}
        </div>

        {/* VIDEOS */}
        <div className="flex flex-wrap gap-2 mt-3">
          {/* LOCAL VIDEO */}
          <div className="w-64 h-48 bg-black rounded overflow-hidden border">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <div className="p-1 text-xs">
              You {muted ? "(muted)" : ""}
            </div>
          </div>

          {/* REMOTE VIDEOS */}
          <div
            ref={remoteVideosRef}
            className="flex flex-wrap gap-2"
            style={{ minHeight: 200 }}
          />
        </div>
      </div>

      {/* RIGHT: PARTICIPANTS */}
      <aside className="w-64 p-2 border-l border-darkHover">
        <h4 className="mb-2 font-semibold">Participants</h4>

        <div className="flex flex-col gap-1">
          {participants.length > 0 ? (
            participants.map((p) => {
              const isInCall = callActiveUsers.includes(p.socketId)
              const isMe = p.socketId === socket?.id

              return (
                <div key={p.socketId} className="text-sm">
                  {p.username || "Unknown"}
                  {isInCall && " joined video call"}
                  {isMe && " (You)"}
                </div>
              )
            })
          ) : (
            <div className="text-sm text-muted">No participants</div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default VideoCallPanel
