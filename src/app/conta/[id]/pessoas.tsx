//tela para adicioanr pessoas a conta
import { Person } from "@/db";
import * as ExpoRouter from "expo-router";
import { ComponentRef, useRef, useState } from "react";
import { TextInput } from "react-native";
import { useDb } from "../../../db/DatabaseProvider";

//transformar erro em mensagem
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

//passo de pessoas
export default function PeopleStep() {
  //conta
  const { id } = ExpoRouter.useLocalSearchParams<{ id: string }>();
  //banco de dados
  const bd = useDb();

  const [people, setPeople] = useState<Person[]>([]);
  const [payerId, setPayerId] = useState<string | null>(null); //quem pagou a conta
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const nickNameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollRef = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollToEndNext = useRef(false); //rolar até o fim da lista
}
