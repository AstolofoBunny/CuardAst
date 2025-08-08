import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { storage } from "./storage";
import { insertUserSchema, insertCardSchema, insertRoomSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUserProfile(req.params.id, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Card routes
  app.get("/api/cards", async (req, res) => {
    try {
      const cards = await storage.getAllCards();
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/cards/:id", async (req, res) => {
    try {
      const card = await storage.getCard(req.params.id);
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(card);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cards", async (req, res) => {
    try {
      const cardData = insertCardSchema.parse(req.body);
      const card = await storage.createCard(cardData);
      res.status(201).json(card);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid card data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cards/:id", async (req, res) => {
    try {
      const card = await storage.updateCard(req.params.id, req.body);
      res.json(card);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cards/:id", async (req, res) => {
    try {
      await storage.deleteCard(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Room routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      res.status(201).json(room);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid room data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.updateRoom(req.params.id, req.body);
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      await storage.deleteRoom(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Room joining routes
  app.post("/api/rooms/:id/join", async (req, res) => {
    try {
      const roomId = req.params.id;
      const { userId, displayName } = req.body;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      if (room.players.length >= room.maxPlayers) {
        return res.status(400).json({ message: "Room is full" });
      }
      
      if (room.players.includes(userId)) {
        return res.status(400).json({ message: "Already in room" });
      }
      
      const updatedRoom = await storage.updateRoom(roomId, {
        players: [...room.players, userId],
        status: room.players.length + 1 >= room.maxPlayers ? 'active' : 'waiting'
      });
      
      // Broadcast room update to WebSocket clients
      broadcastRoomUpdate(roomId, updatedRoom);
      
      res.json(updatedRoom);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms/:id/ready", async (req, res) => {
    try {
      const roomId = req.params.id;
      const { userId } = req.body;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const playersReady = room.playersReady || [];
      if (!playersReady.includes(userId)) {
        const updatedRoom = await storage.updateRoom(roomId, {
          playersReady: [...playersReady, userId]
        });
        
        // If all players are ready, start the battle
        if (updatedRoom.playersReady?.length === updatedRoom.players.length) {
          const battleId = await createBattle(roomId, updatedRoom.players);
          await storage.updateRoom(roomId, { battleId });
        }
        
        broadcastRoomUpdate(roomId, updatedRoom);
        res.json(updatedRoom);
      } else {
        res.json(room);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Battle routes
  app.post("/api/battles/:id/attack", async (req, res) => {
    try {
      const battleId = req.params.id;
      const { attackerId, attackerPosition, targetPosition, targetType } = req.body;
      
      const result = await handleBattleAttack(battleId, attackerId, attackerPosition, targetPosition, targetType);
      
      if (result.success) {
        broadcastBattleUpdate(battleId, result.battle);
        res.json(result);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/battles/:id/place-card", async (req, res) => {
    try {
      const battleId = req.params.id;
      const { playerId, cardId, position } = req.body;
      
      const result = await handlePlaceCard(battleId, playerId, cardId, position);
      
      if (result.success) {
        broadcastBattleUpdate(battleId, result.battle);
        res.json(result);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer });
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
