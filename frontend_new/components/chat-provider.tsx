import React, { createContext, useState, useContext } from 'react';

// Tạo Context
const ChatContext = createContext<any>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [bgImage, setBgImage] = useState("https://i.pinimg.com/736x/8c/98/99/8c98994518b575bf0d974971fd755b02.jpg");

  return (
    <ChatContext.Provider value={{ bgImage, setBgImage }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);