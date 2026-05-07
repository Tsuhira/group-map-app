import { useState, useEffect, useCallback } from "react";
import * as fs from "../lib/firestoreRest";
import { sampleNodes } from "../data/sampleNodes";

export function useNodes(user, authLoading, currentMapId = "groupmap") {
  const [nodes, setNodes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setNodes(null);
    if (authLoading) return;
    if (!user) {
      setNodes(sampleNodes);
      return;
    }
    fs.listNodes(user.idToken, currentMapId)
      .then(n => { if (!cancelled) setNodes(n); })
      .catch(err => {
        console.error("Firestore load failed:", err);
        if (!cancelled) setNodes([]);
      });
    return () => { cancelled = true; };
  }, [authLoading, user, currentMapId]);

  const mode = user ? "firestore" : "standalone";

  const addNode = useCallback(async (node) => {
    if (mode === "firestore") {
      await fs.setNode(node, user.idToken, currentMapId);
      setNodes(prev => [...(prev ?? []), node]);
    } else {
      setNodes(prev => [...(prev ?? []), node]);
    }
  }, [mode, user, currentMapId]);

  const updateNode = useCallback(async (node) => {
    if (mode === "firestore") {
      await fs.setNode(node, user.idToken, currentMapId);
      setNodes(prev => prev?.map(n => n.id === node.id ? node : n) ?? []);
    } else {
      setNodes(prev => prev?.map(n => n.id === node.id ? node : n) ?? []);
    }
  }, [mode, user, currentMapId]);

  const deleteNode = useCallback(async (nodeId) => {
    if (mode === "firestore") {
      await fs.deleteNode(nodeId, user.idToken, currentMapId);
      setNodes(prev => prev?.filter(n => n.id !== nodeId) ?? []);
    } else {
      setNodes(prev => prev?.filter(n => n.id !== nodeId) ?? []);
    }
  }, [mode, user, currentMapId]);

  const replaceAll = useCallback(async (newNodes) => {
    if (mode === "firestore") {
      await fs.replaceAll(newNodes, user.idToken, currentMapId);
      setNodes(newNodes);
    } else {
      setNodes(newNodes);
    }
  }, [mode, user, currentMapId]);

  return { nodes, mode, addNode, updateNode, deleteNode, replaceAll };
}
