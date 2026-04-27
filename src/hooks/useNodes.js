import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection, onSnapshot, doc, setDoc, deleteDoc,
  writeBatch, getDocs,
} from "firebase/firestore";
import { sampleNodes } from "../data/sampleNodes";

const COL = "groupmap";

export function useNodes(user, authLoading) {
  const [nodes, setNodes] = useState(null); // null = loading

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setNodes(sampleNodes);
      return;
    }

    const unsub = onSnapshot(collection(db, COL), snap => {
      setNodes(snap.docs.map(d => d.data()));
    });
    return unsub;
  }, [authLoading, user]);

  const mode = user ? "firestore" : "standalone";

  const addNode = useCallback(async (node) => {
    if (mode === "firestore") {
      await setDoc(doc(db, COL, node.id), node);
    } else {
      setNodes(prev => [...prev, node]);
    }
  }, [mode]);

  const updateNode = useCallback(async (node) => {
    if (mode === "firestore") {
      await setDoc(doc(db, COL, node.id), node);
    } else {
      setNodes(prev => prev.map(n => n.id === node.id ? node : n));
    }
  }, [mode]);

  const deleteNode = useCallback(async (nodeId) => {
    if (mode === "firestore") {
      await deleteDoc(doc(db, COL, nodeId));
    } else {
      setNodes(prev => prev.filter(n => n.id !== nodeId));
    }
  }, [mode]);

  const replaceAll = useCallback(async (newNodes) => {
    if (mode === "firestore") {
      const existing = await getDocs(collection(db, COL));
      const batch = writeBatch(db);
      existing.docs.forEach(d => batch.delete(d.ref));
      newNodes.forEach(n => batch.set(doc(db, COL, n.id), n));
      await batch.commit();
    } else {
      setNodes(newNodes);
    }
  }, [mode]);

  return { nodes, mode, addNode, updateNode, deleteNode, replaceAll };
}
