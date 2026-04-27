import { useState, useEffect, useCallback } from "react";
import * as fs from "../lib/firestoreRest";
import { sampleNodes } from "../data/sampleNodes";

export function useNodes(user, authLoading) {
  const [nodes, setNodes] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNodes(sampleNodes);
      return;
    }
    fs.listNodes(user.idToken)
      .then(setNodes)
      .catch(err => {
        console.error("Firestore load failed:", err);
        setNodes([]);
      });
  }, [authLoading, user]);

  const mode = user ? "firestore" : "standalone";

  const addNode = useCallback(async (node) => {
    if (mode === "firestore") {
      await fs.setNode(node, user.idToken);
      setNodes(prev => [...(prev ?? []), node]);
    } else {
      setNodes(prev => [...(prev ?? []), node]);
    }
  }, [mode, user]);

  const updateNode = useCallback(async (node) => {
    if (mode === "firestore") {
      await fs.setNode(node, user.idToken);
      setNodes(prev => prev?.map(n => n.id === node.id ? node : n) ?? []);
    } else {
      setNodes(prev => prev?.map(n => n.id === node.id ? node : n) ?? []);
    }
  }, [mode, user]);

  const deleteNode = useCallback(async (nodeId) => {
    if (mode === "firestore") {
      await fs.deleteNode(nodeId, user.idToken);
      setNodes(prev => prev?.filter(n => n.id !== nodeId) ?? []);
    } else {
      setNodes(prev => prev?.filter(n => n.id !== nodeId) ?? []);
    }
  }, [mode, user]);

  const replaceAll = useCallback(async (newNodes) => {
    if (mode === "firestore") {
      await fs.replaceAll(newNodes, user.idToken);
      setNodes(newNodes);
    } else {
      setNodes(newNodes);
    }
  }, [mode, user]);

  return { nodes, mode, addNode, updateNode, deleteNode, replaceAll };
}
