//tela para adicioanr pessoas a conta
import { getAccount, listPeople, Person, personLabel } from "@/db";
import * as ExpoRouter from "expo-router";
import { useFocusEffect } from "expo-router/build/react-navigation/index.js";
import { ComponentRef, useCallback, useRef, useState } from "react";
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
  const db = useDb();

  const [people, setPeople] = useState<Person[]>([]);
  const [payerId, setPayerId] = useState<string | null>(null); //quem pagou a conta
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const nickNameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollRef = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollToEndNext = useRef(false); //rolar até o fim da listaw

  //atualizar informações com o banco de dados
  const reload = useCallback(async () => {
    const [account, list] = await Promise.all([
      getAccount(db, id),
      listPeople(db, id),
    ]);
    setPeople(list);
    setPayerId(account?.payerId ?? null);
  }, [db, id]);

  //controlar o comportamento da tela com e sem foco
  useFocusEffect(
    useCallback(() => {
      reload.catch((error) =>
        console.error("Falaha ao carregar as pessoas: ", error),
      );
    }, [reload]),
  );

  //rolar até o fim da lista, onde a nova pessoa aparece
  const scrollToEndSoon = () => {
    scrollToEndNext.current = true;
    //garantir a rolagem mesmo quando a lista não mudar de tamanho
    setTimeout(() => {
      if (scrollToEndNext.current) {
        scrollToEndNext.current = false;
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 500);
  };

  //limpar formulário
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setNickname("");
  };

  //validações: duas pessoas não podem ter o mesmo nome de exibição
  const typedLabel = (nickname.trim() || name.trim()).toLowerCase();
  const duplicate =
    typedLabel !== "" &&
    people.some(
      (p) => p.id !== editingId && personLabel(p).toLowerCase() === typedLabel,
    );
  const canSave = name.trim().length > 0 && !duplicate;
}
