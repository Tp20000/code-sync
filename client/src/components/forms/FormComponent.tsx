import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import logo from "@/assets/logo.svg"
import { FiCopy, FiLink } from "react-icons/fi"

const FormComponent = () => {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()

    // 🔹 Create new Room ID + auto copy
    const createNewRoomId = async () => {
        const roomId = uuidv4()
        setCurrentUser({ ...currentUser, roomId })
        await navigator.clipboard.writeText(roomId)
        toast.success("Room ID created & copied")
        usernameRef.current?.focus()
    }

    // 🔹 Copy only Room ID
    const copyRoomId = async () => {
        if (!currentUser.roomId) {
            toast.error("No Room ID to copy")
            return
        }
        await navigator.clipboard.writeText(currentUser.roomId)
        toast.success("Room ID copied")
    }

    // 🔹 Copy full invite link
    const copyInviteLink = async () => {
        if (!currentUser.roomId) {
            toast.error("No Room ID to copy")
            return
        }
        const link = `${window.location.origin}/editor/${currentUser.roomId}`
        await navigator.clipboard.writeText(link)
        toast.success("Invite link copied")
    }

    const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setCurrentUser({ ...currentUser, [name]: value })
    }

    const validateForm = () => {
        if (currentUser.username.trim().length === 0) {
            toast.error("Enter your username")
            return false
        }
        if (currentUser.roomId.trim().length < 5) {
            toast.error("ROOM Id must be at least 5 characters long")
            return false
        }
        if (currentUser.username.trim().length < 3) {
            toast.error("Username must be at least 3 characters long")
            return false
        }
        return true
    }

    const joinRoom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === USER_STATUS.ATTEMPTING_JOIN) return
        if (!validateForm()) return

        toast.loading("Joining room...")
        setStatus(USER_STATUS.ATTEMPTING_JOIN)
        socket.emit(SocketEvent.JOIN_REQUEST, currentUser)
    }

    useEffect(() => {
        if (currentUser.roomId.length > 0) return
        if (location.state?.roomId) {
            setCurrentUser({ ...currentUser, roomId: location.state.roomId })
            toast.success("Enter your username")
        }
    }, [currentUser, location.state?.roomId, setCurrentUser])

    useEffect(() => {
        if (status === USER_STATUS.JOINED) {
            navigate(`/editor/${currentUser.roomId}`, {
                state: { username: currentUser.username },
            })
        }
    }, [status, navigate, currentUser])

    return (
        <div className="flex w-full max-w-[500px] flex-col items-center gap-4 p-4 sm:p-8">
            <img src={logo} alt="Logo" className="w-full" />

            <form onSubmit={joinRoom} className="flex w-full flex-col gap-4">
                {/* Room ID input + copy buttons */}
                <div className="relative">
                    <input
                        type="text"
                        name="roomId"
                        placeholder="Room Id"
                        className="w-full rounded-md border border-gray-500 bg-darkHover px-3 py-3 pr-24 focus:outline-none"
                        onChange={handleInputChanges}
                        value={currentUser.roomId}
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-2">
                        <button
                            type="button"
                            onClick={copyRoomId}
                            title="Copy Room ID"
                            className="rounded p-1 hover:bg-dark"
                        >
                            <FiCopy />
                        </button>
                        <button
                            type="button"
                            onClick={copyInviteLink}
                            title="Copy Invite Link"
                            className="rounded p-1 hover:bg-dark"
                        >
                            <FiLink />
                        </button>
                    </div>
                </div>

                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    className="w-full rounded-md border border-gray-500 bg-darkHover px-3 py-3 focus:outline-none"
                    onChange={handleInputChanges}
                    value={currentUser.username}
                    ref={usernameRef}
                />

                <button
                    type="submit"
                    className="mt-2 w-full rounded-md bg-primary px-8 py-3 text-lg font-semibold text-black"
                >
                    Join
                </button>
            </form>

            <button
                className="cursor-pointer select-none underline"
                onClick={createNewRoomId}
            >
                Generate Unique Room Id
            </button>
        </div>
    )
}

export default FormComponent
