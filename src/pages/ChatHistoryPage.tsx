import React from "react";
// import { TopNav } from "@/components/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Dummy chat data (replace with real data fetching later)
const dummyChats = [
  {
    id: 1,
    user: "You",
    message: "How do I generate a summary?",
    date: "2024-06-01 17:00",
  },
  {
    id: 2,
    user: "AI",
    message: "Click the 'Generate SOP Summary' button.",
    date: "2024-06-01 17:01",
  },
  {
    id: 3,
    user: "You",
    message: "Show me the last uploaded document.",
    date: "2024-05-29 10:15",
  },
  // ...more dummy data
];

export default function ChatHistoryPage() {
  // Filter for last 30 days
  const now = new Date();
  const chats = dummyChats.filter((chat) => {
    const chatDate = new Date(chat.date);
    return (now.getTime() - chatDate.getTime()) / (1000 * 60 * 60 * 24) <= 30;
  });

  // Get the last namespace from the most recent chat
  const lastNamespace = chats.length > 0 ? chats[0].id.toString() : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* <TopNav lastNamespace={lastNamespace} /> */}
      <div className="flex-1 flex flex-col items-center p-8">
        <Card className="w-full max-w-6xl border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">
              Chat History (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] pr-4">
              {dummyChats.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  No chat history in the last 30 days.
                </div>
              ) : (
                <div className="space-y-4">
                  {dummyChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg p-4 border",
                        chat.user === "You"
                          ? "bg-primary/10 border-primary/20"
                          : "bg-muted border-border"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={cn(
                            "font-semibold",
                            chat.user === "You"
                              ? "text-primary"
                              : "text-foreground"
                          )}
                        >
                          {chat.user}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chat.date}
                        </span>
                      </div>
                      <div className="text-foreground/90 mt-1">
                        {chat.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
