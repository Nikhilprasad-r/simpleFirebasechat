"use client";
import AssistanceIcon from "@/components/icons/AssistanceIcon";
import CloseIcon from "@/components/icons/CloseIcon";
import SendIcon from "@/components/icons/SendIcon";
import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/utils/firebase/firebase";
import { getCookieInClientSide } from "@/utils/cognito/utils/client";

const YourPcAssistant = () => {
  const [openAssistanceChat, setOpenAssistanceChat] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userData = getCookieInClientSide("userData");

  let user: any;
  if (userData) {
    user = JSON.parse(userData);
  }

  const chatSessionsCollectionRef = collection(db, "chatSessions");
  const chatCollectionRef = sessionId
    ? collection(db, `chatSessions/${sessionId}/messages`)
    : null;

  const createNewChatSession = async () => {
    const newSessionDoc = await addDoc(chatSessionsCollectionRef, {
      userId: user.payload.userName,
      createdAt: new Date(),
      status:"active"
    });
    setSessionId(newSessionDoc.id);
  };

  const checkAndCreateChatSession = async () => {
    const q = query(chatSessionsCollectionRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    let sessionFound = false;
    
    querySnapshot.forEach((doc) => {
      if (
        doc.data().userId === user.payload.userName &&
        doc.data().status === "active"
      ) {
        setSessionId(doc.id);
        sessionFound = true;
      }
    });

    if (!sessionFound) {
      await createNewChatSession();
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      await checkAndCreateChatSession();
    };
    initializeChat();
  }, []);

  useEffect(() => {
    if (sessionId && chatCollectionRef) {
      const q = query(chatCollectionRef, orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs: any[] = [];
        querySnapshot.forEach((doc) => {
          msgs.push(doc.data());
        });
        setMessages(msgs);
      });

      return () => unsubscribe();
    }
  }, [sessionId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !chatCollectionRef) return;

    try {
      await addDoc(chatCollectionRef, {
        message: newMessage,
        createdAt: new Date(),
        sender: "user",
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  return (
    <>
      <div
        className="p-2 sm:px-5 sm:py-3 flex items-center gap-2 sm:gap-5 border border-black/20 rounded-xl sm:rounded-3xl cursor-pointer active:bg-secondary"
        onClick={() => setOpenAssistanceChat(!openAssistanceChat)}
      >
        <div className="relative p-1 sm:p-2 lg:p-3 border border-black/20 rounded-lg sm:rounded-3xl">
          <AssistanceIcon
            width={41}
            height={41}
            className="w-3 h-3 sm:w-9 sm:h-9"
          />
          <div className="h-[6px] w-[6px] sm:h-3 sm:w-3 lg:h-4 lg:w-4 bg-red-500 rounded-full absolute top-0 right-0"></div>
        </div>
        <p className="font-bold text-[0.81rem] sm:text-[1rem] lg:text-[1.2rem]">
          Your PC Assistant
        </p>
      </div>

      <aside
        className={`fixed z-[50] bottom-0 right-0 sm:right-10 w-[100vw] sm:w-[400px] h-[90vh] sm:h-[600px] bg-white overflow-hidden rounded-2xl border-2 border-black/20 px-2 pb-1 flex flex-col transform transition-all ease-out duration-500 ${
          openAssistanceChat ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <header className="p-2 sm:px-5 sm:py-3 flex items-center justify-between gap-2 sm:gap-5 border-b border-black/20">
          <div className="flex items-center gap-2">
            <div className="relative p-1 sm:p-2 border border-black/20 rounded-lg sm:rounded-2xl">
              <AssistanceIcon
                width={41}
                height={41}
                className="w-3 h-3 sm:w-5 sm:h-5"
              />
            </div>
            <p className="font-bold text-[0.81rem] sm:text-[1rem]">
              Your PC Assistant
            </p>
          </div>
          <div
            className="cursor-pointer"
            onClick={() => setOpenAssistanceChat(!openAssistanceChat)}
          >
            <CloseIcon className="w-8 h-8" />
          </div>
        </header>
        <div className="flex-1 overflow-auto pb-20">
          <ul className="flex flex-col gap-5 py-3 h-full overflow-auto">
            <p className="text-[0.6rem] text-smokey-grey font-medium leading-none text-center">
              Today
            </p>
            {messages
              .filter(
                (message) =>
                  message.sender === "admin" || message.sender === "user"
              )
              .map((message, index) => (
                <li
                  key={index}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  } gap-2`}
                >
                  {message.sender === "admin" && (
                    <div className="self-end bg-[rgba(228,160,37,0.15)] p-3 rounded-full">
                      <AssistanceIcon className="w-3 h-3 sm:w-4 sm:h-4 fill-primary" />
                    </div>
                  )}
                  <div className=" leading-none flex flex-col gap-1">
                    <p
                      className={`w-fit text-sm rounded-md ${
                        message.sender === "user"
                          ? "bg-primary text-white"
                          : "bg-secondary border text-smokey-grey"
                      } font-medium py-3 px-4 m-0`}
                    >
                      {message.message}
                    </p>
                    <div className="w-full flex items-center">
                      <p className="relative text-[0.5rem] text-smokey-grey font-medium leading-none">
                        {message.sender === "user"
                          ? "You"
                          : message.sender === "admin" && "Your PC Assistant"}
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
            <div ref={messagesEndRef} />
          </ul>
        </div>
        <section className="chat-input w-full h-auto absolute left-0 bottom-0 bg-white px-2 py-1">
          <div className="bg-secondary py-1 px-5 w-full rounded-xl flex gap-1 items-center">
            <textarea
              className="border-none outline-none text-sm resize-none pt-4 pl-3 h-[50px] w-full bg-transparent"
              required
              placeholder="Enter your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            ></textarea>
            <span
              className="self-center bg-primary p-2 rounded-full cursor-pointer"
              onClick={handleSendMessage}
            >
              <SendIcon width={22} height={19} />
            </span>
          </div>
        </section>
      </aside>
    </>
  );
};

export default YourPcAssistant;
