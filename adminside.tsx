"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  onSnapshot,
  updateDoc,
  where,
  doc,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../../services/firebase";
import SendIcon from "@/components/ui/SendIcon";

interface Message {
  sender: string;
  message: string;
  createdAt: any;
}

interface MessageUser {
  userId?: string;
  id: string;
  status: string;
  newMessage: boolean;
}

const subscribeToMessages = (
  selectedUser: string | null,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  if (!selectedUser) return;

  const q = query(
    collection(db, `userChats/${selectedUser}/messages`),
    orderBy("createdAt", "asc")
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot: QuerySnapshot<DocumentData>) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push(doc.data() as Message);
      });
      setMessages(msgs);
    }
  );

  return unsubscribe;
};

const YourPcAssistant = () => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    const unsubscribeUsers = subscribeToUsers();

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const { data: users = [], isLoading: usersLoading } = useQuery<MessageUser[]>(
    {
      queryKey: ["users"],
      queryFn: () => fetchUsers(),
    }
  );
  const subscribeToUsers = () => {
    const q = query(collection(db, "userChats"));

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const usersList: MessageUser[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as MessageUser);
      });
      queryClient.setQueryData<MessageUser[]>(["users"], usersList);
    });
  };
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

  const fetchUsers = async (): Promise<MessageUser[]> => {
    const q = query(collection(db, "userChats"));
    const querySnapshot = await getDocs(q);
    const usersList: MessageUser[] = [];
    querySnapshot.forEach((doc) => {
      usersList.push({ id: doc.id, ...doc.data() } as MessageUser);
    });
    console.log(usersList);
    return usersList;
  };

  const fetchMessages = async (
    selectedUser: string | null
  ): Promise<Message[]> => {
    if (!selectedUser) return [];
    const q = query(
      collection(db, `userChats/${selectedUser}/messages`),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];
    querySnapshot.forEach((doc) => {
      messages.push(doc.data() as Message);
    });
    return messages;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedUser) throw new Error("No user selected");
      await updateDoc(doc(db, "userChats", selectedUser), {
        newMessage: false,
      });
      await addDoc(collection(db, `userChats/${selectedUser}/messages`), {
        message: message,
        createdAt: new Date(),
        sender: "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser] });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;
    sendMessageMutation.mutate(newMessage);
    setNewMessage("");
  };

  useEffect(() => {
    if (selectedUser) {
      const unsubscribe = subscribeToMessages(selectedUser, setMessages);
      return () => unsubscribe && unsubscribe();
    }
  }, [selectedUser]);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div className="flex w-full top-0 bottom-0 py-2 md:py-4 ">
      <aside className="w-1/4 bg-white h-screen border-r border-gray-300">
        <header className="p-4 border-b border-gray-300 flex justify-between items-center bg-indigo-600 text-white">
          <h1 className="text-2xl font-semibold">Customer Chat</h1>
        </header>

        <div className="overflow-y-auto p-3 mb-9 pb-20">
          {usersLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              No chats Initiated
            </div>
          ) : (
            users
              .filter((user) => user.status !== "closed")
              .map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md ${
                    user.newMessage && "bg-green-300/40"
                  }`}
                  onClick={() => {
                    setSelectedUser(user.id);
                    setSelectedUserName(user.userId ?? "");
                  }}
                >
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">
                      {user?.userId?.split("@")[0]}
                    </h2>
                  </div>
                </div>
              ))
          )}
        </div>
      </aside>

      {selectedUser ? (
        <article className="bg-secondary   py-5 border border-black/30 max-h-screen flex flex-col justify-between h-screen w-full">
          {selectedUser && (
            <header className="flex items-center justify-between px-3 sm:px-8 gap-3 pb-3 border-b border-black/30">
              <h4 className="font-bold text-base sm:text-xl">
                {selectedUserName}
              </h4>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedUserName("");
                  setMessages([]);
                  setNewMessage("");
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-md"
              >
                X
              </button>
            </header>
          )}

          <div className="flex-1 overflow-auto px-3 sm:px-8">
            <ul
              className="flex flex-col gap-5 py-3 h-full overflow-auto"
              ref={messagesEndRef}
            >
              {messages.length !== 0 &&
                messages.map((message, index) => (
                  <li
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
                  </li>
                ))}
            </ul>
          </div>
          <footer className="relative">
            <input
              type="text"
              className="bg-white rounded-xl w-full h-14 px-5"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Enter your message..."
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-5">
              <button
                className="bg-[#e4a025] p-2 rounded-full cursor-pointer"
                onClick={handleSendMessage}
              >
                <SendIcon className="w-[20px] h-[20px]" />
              </button>
            </div>
          </footer>
        </article>
      ) : (
        <div className="w-full flex items-center justify-center text-3xl ">
          Select a user to chat
        </div>
      )}
    </div>
  );
};

export default YourPcAssistant;
