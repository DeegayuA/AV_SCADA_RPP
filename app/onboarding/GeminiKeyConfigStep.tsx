"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const GeminiKeyConfigStep: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem("geminiApiKey");
    if (storedKey) {
      setIsKeyConfigured(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (apiKey) {
      localStorage.setItem("geminiApiKey", apiKey);
      setIsKeyConfigured(true);
      toast({
        title: "Success",
        description: "Gemini API Key saved.",
      });
    } else {
      toast({
        title: "Error",
        description: "Please enter an API key.",
        variant: "destructive",
      });
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("geminiApiKey");
    setIsKeyConfigured(false);
    setApiKey("");
    toast({
      title: "Info",
      description: "Gemini API Key cleared.",
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Configure Gemini API Key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isKeyConfigured ? (
          <div>
            <p className="text-green-600 font-medium mb-2">
              Gemini API Key is configured.
            </p>
            <Button onClick={handleClearKey} variant="outline">
              Clear Key
            </Button>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              Please enter your Gemini API Key. This key will be stored in your
              browser&apos;s local storage.
            </p>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API Key"
              className="mb-2"
            />
            <Button onClick={handleSaveKey}>Save Key</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeminiKeyConfigStep;
