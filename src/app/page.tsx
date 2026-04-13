import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const [status, setStatus] = useState("Testando conexão...");

  useEffect(() => {
    const testar = async () => {
      const supabase = createClient();

      const { data, error } = await supabase.from("test").select("*");

      if (error) {
        setStatus("Erro na conexão");
      } else {
        setStatus("Conectado com sucesso");
      }
    };

    testar();
  }, []);

  return <div>{status}</div>;
}