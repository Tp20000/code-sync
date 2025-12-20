import React from "react"
import { useSocket } from "@/context/SocketContext"
import VideoCallPanel from "@/components/video/VideoCallPanel"
import useResponsive from "@/hooks/useResponsive"

const VideoView: React.FC = () => {
  const { socket, roomId, username } = useSocket()
  const { viewHeight } = useResponsive()

  // 🔒 Guard: room not joined yet
  if (!roomId) {
    return (
      <div
        className="flex w-full flex-col p-4"
        style={{ height: viewHeight }}
      >
        <h1 className="view-title">Video Call</h1>
        <div className="mt-4 rounded-md border border-darkHover bg-dark p-6 text-sm text-muted">
          No room selected. Open a project room first.
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex w-full flex-col p-4"
      style={{ height: viewHeight }}
    >
      <h1 className="view-title">Video Call</h1>

      <div className="mt-3 flex-1 rounded-md border border-darkHover bg-dark p-3">
        <VideoCallPanel
          roomId={roomId} // ✅ now guaranteed string
          user={{
            username: username ?? "Anonymous",
            socketId: socket?.id,
          }}
        />
      </div>
    </div>
  )
}

export default VideoView
