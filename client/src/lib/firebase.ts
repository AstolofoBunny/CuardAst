import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCWdNcCu4xMuUflyqKGQihpaf-XOlQQNXo",
  authDomain: "astolfokurd.firebaseapp.com",
  projectId: "astolfokurd",
  storageBucket: "astolfokurd.firebasestorage.com",
  messagingSenderId: "296188348285",
  appId: "1:296188348285:web:eb8062bb0b9d1dc0612e14",
  measurementId: "G-VQ75SHXCNM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Base card set that will be created on app initialization
export const BASE_CARDS = [
  {
    id: 'fire-knight',
    name: 'Fire Knight',
    type: 'battle',
    class: 'melee',
    health: 8,
    damage: 6,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    passiveSkill: 'Burning Blade: 10% chance to deal +1 damage',
    isBase: true
  },
  {
    id: 'storm-archer',
    name: 'Storm Archer',
    type: 'battle',
    class: 'ranged',
    health: 5,
    damage: 7,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    passiveSkill: 'Wind Shot: +15% critical chance',
    isBase: true
  },
  {
    id: 'frost-mage',
    name: 'Frost Mage',
    type: 'battle',
    class: 'mage',
    health: 4,
    damage: 8,
    imageUrl: 'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    passiveSkill: 'Frost Armor: Reduce incoming damage by 1',
    isBase: true
  },
  {
    id: 'shadow-assassin',
    name: 'Shadow Assassin',
    type: 'battle',
    class: 'melee',
    health: 6,
    damage: 7,
    imageUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    passiveSkill: 'Stealth Strike: +25% critical damage',
    isBase: true
  },
  {
    id: 'crystal-guardian',
    name: 'Crystal Guardian',
    type: 'battle',
    class: 'mage',
    health: 7,
    damage: 5,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    passiveSkill: 'Crystal Shield: +2 health regeneration per turn',
    isBase: true
  },
  {
    id: 'lightning-bolt',
    name: 'Lightning Bolt',
    type: 'ability',
    cost: 25,
    imageUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    description: 'Deal 3 direct damage to opponent',
    isBase: true
  },
  {
    id: 'healing-potion',
    name: 'Healing Potion',
    type: 'ability',
    cost: 20,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    description: 'Restore 5 HP to yourself',
    isBase: true
  },
  {
    id: 'energy-boost',
    name: 'Energy Boost',
    type: 'ability',
    cost: 15,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    description: 'Restore 30 energy',
    isBase: true
  },
  {
    id: 'critical-strike',
    name: 'Critical Strike',
    type: 'ability',
    cost: 30,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    description: 'Next battle card deals double damage',
    isBase: true
  },
  {
    id: 'shield-wall',
    name: 'Shield Wall',
    type: 'ability',
    cost: 35,
    imageUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=140',
    description: 'Reduce incoming damage by 50% this turn',
    isBase: true
  }
];

export default app;
