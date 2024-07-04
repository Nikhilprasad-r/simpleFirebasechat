
//user side
"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  QuerySnapshot,
  DocumentData
} from "firebase/firestore";
import { db } from "../../../components/FirebaseChat/config";

interface Message {
  sender: string;
  message: string;
  createdAt: any; 
}

interface MessageUser {
  userId?: string;
  id: string;
  status: string;
}

const subscribeToMessages = (selectedUser: string | null, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  if (!selectedUser) return;

  const q = query(
    collection(db, `chatSessions/${selectedUser}/messages`),
    orderBy("createdAt", "asc")
  );

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const msgs: Message[] = [];
    querySnapshot.forEach((doc) => {
      msgs.push(doc.data() as Message);
    });
    setMessages(msgs);
  });

  return unsubscribe;
};

const fetchUsers = async (): Promise<MessageUser[]> => {
  const q = query(collection(db, "chatSessions"), orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);
  const usersList: MessageUser[] = [];
  querySnapshot.forEach((doc) => {
    usersList.push({ id: doc.id, ...doc.data() } as MessageUser);
  });
  return usersList;
};

const fetchMessages = async (selectedUser: string | null): Promise<Message[]> => {
  if (!selectedUser) return [];
  const q = query(
    collection(db, `chatSessions/${selectedUser}/messages`),
    orderBy("createdAt", "asc")
  );
  const querySnapshot = await getDocs(q);
  const messages: Message[] = [];
  querySnapshot.forEach((doc) => {
    messages.push(doc.data() as Message);
  });
  return messages;
};

const Page = () => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery<MessageUser[]>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const messageQuery = useQuery<Message[]>({
    queryKey: ["messages", selectedUser],
    queryFn: () => fetchMessages(selectedUser),
    enabled: !!selectedUser,
  });

  useEffect(() => {
    if (messageQuery.data) {
      setMessages(messageQuery.data);
    }
  }, [messageQuery.data]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedUser) throw new Error("No user selected");
      await addDoc(collection(db, `chatSessions/${selectedUser}/messages`), {
        message: message,
        createdAt: new Date(),
        sender: "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser] });
    },
  });

  const endChatMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("No user selected");
      const chatSessionRef = doc(db, "chatSessions", selectedUser);
      await updateDoc(chatSessionRef, {
        status: "closed",
      });
    },
    onSuccess: () => {
      setSelectedUser(null);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;
    sendMessageMutation.mutate(newMessage);
    setNewMessage("");
  };

  const handleEndChat = () => {
    endChatMutation.mutate();
  };

  useEffect(() => {
    if (selectedUser) {
      const unsubscribe = subscribeToMessages(selectedUser, setMessages);
      return () => unsubscribe && unsubscribe();
    }
  }, [selectedUser]);

  return (
    <div className="flex w-full h-screen top-0 bottom-0 py-2 md:py-4 ">
      <div className="w-1/4 bg-white border-r border-gray-300">
        <header className="p-4 border-b border-gray-300 flex justify-between items-center bg-indigo-600 text-white">
          <h1 className="text-2xl font-semibold">Customer Chat</h1>
        </header>

        <div className="overflow-y-auto p-3 mb-9 pb-20">
          {usersLoading ? (
            <p>Loading users...</p>
          ) : (
            users
              .filter((user) => user.status !== "closed")
              .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md"
                  onClick={() => {
                    setSelectedUser(user.id);
                    setSelectedUserName(user.userId ?? "");
                  }}
                >
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{user.userId}</h2>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <header className="bg-white p-4 text-gray-700 flex justify-between items-center">
          <h1 className="text-2xl font-semibold">{selectedUserName}</h1>
          {selectedUser && (
            <button
              onClick={handleEndChat}
              className="bg-red-500 text-white px-4 py-2 rounded-md"
            >
              End Chat
            </button>
          )}
        </header>

        <div className="overflow-y-auto p-4 pb-36">
          {messages.length === 0 ? (
            <p>Loading messages...</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex mb-4 ${
                  message.sender === "admin" ? "justify-end" : ""
                } cursor-pointer`}
              >
                <div className="leading-none flex flex-col gap-1">
                  <p
                    className={`w-fit text-sm rounded-md ${
                      message.sender === "admin"
                        ? "bg-[#e4a025] text-white"
                        : "bg-[rgba(18, 18, 18, 0.04)] border text-[#757575]"
                    } font-medium py-3 px-4 m-0`}
                  >
                    {message.message}
                  </p>
                  <div className="w-full flex items-center">
                    <p className="relative text-[0.5rem] text-smokey-grey font-medium leading-none">
                      {message.sender === "admin"
                        ? "You"
                        : message.sender === "user" && "user"}
                    </p>
                    <p className="text-[0.5rem] text-smokey-grey font-medium leading-none ml-2">
                      {new Date(
                        message.createdAt.seconds * 1000
                      ).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="bg-white border-t border-gray-300 p-4 absolute bottom-0 right-0 left-0">
          <div className="flex items-center">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter your message..."
              className="w-full p-2 rounded-md border border-gray-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSendMessage}
              className="bg-indigo-500 text-white px-4 py-2 rounded-md ml-2"
            >
              Send
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Page;
