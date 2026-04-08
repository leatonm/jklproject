import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ProgramProvider } from "@/data/ProgramContext";
import { App } from "./App";
import { configureAmplify } from "@/lib/configureAmplify";
import "./index.css";

configureAmplify();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProgramProvider>
          <App />
        </ProgramProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
