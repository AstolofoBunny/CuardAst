import { storage } from "./storage";
import type { Card } from "@shared/schema";

export interface BattleResult {
  success: boolean;
  error?: string;
  damageDealt?: number;
  isCritical?: boolean;
  cardDestroyed?: boolean;
  attackResult?: string;
}

// Simplified damage calculation function that can be used by the frontend
export async function calculateBattleDamage(
  attackerCardId: string,
  targetCardId?: string,
  currentRound: number = 1
): Promise<BattleResult> {
  try {
    // Validate round >= 2 for attacks
    if (currentRound < 2) {
      return { success: false, error: "Cannot attack before round 2" };
    }

    // Get attacker card stats
    const attackerCard = await storage.getCard(attackerCardId);
    if (!attackerCard) {
      return { success: false, error: "Attacker card not found" };
    }

    let baseDamage = attackerCard.attack || 0;
    let finalDamage = baseDamage;
    let isCritical = false;
    let cardDestroyed = false;
    let attackResult = "";

    // Check for critical hit
    const critChance = attackerCard.criticalChance || 0;
    if (Math.random() * 100 < critChance) {
      isCritical = true;
      const critDamage = attackerCard.criticalDamage || 100;
      // Your formula: Base damage + (% critical damage)
      finalDamage = baseDamage + Math.round(baseDamage * (critDamage / 100));
      attackResult += `Critical Hit! Base ${baseDamage} + ${critDamage}% = ${finalDamage} damage. `;
    }

    if (targetCardId) {
      // Attack enemy card
      const targetCard = await storage.getCard(targetCardId);
      if (!targetCard) {
        return { success: false, error: "Target card not found" };
      }

      // Calculate resistance based on attacker's class
      let resistance = 0;
      if (attackerCard.class === 'ranged') {
        resistance = targetCard.rangedResistance || 0;
      } else if (attackerCard.class === 'melee') {
        resistance = targetCard.meleeResistance || 0;
      } else if (attackerCard.class === 'mage') {
        resistance = targetCard.magicResistance || 0;
      }

      // Your formula: damage - (resistance % of damage) - defense
      const resistanceReduction = Math.round(finalDamage * (resistance / 100));
      const afterResistance = Math.max(0, finalDamage - resistanceReduction);
      const defense = targetCard.defense || 0;
      finalDamage = Math.max(0, afterResistance - defense);

      attackResult += `After ${resistance}% ${attackerCard.class} resistance (-${resistanceReduction}) and ${defense} defense: ${finalDamage} final damage. `;

      // Check if this would destroy the card
      const targetHealth = targetCard.health || 1;
      if (finalDamage >= targetHealth) {
        cardDestroyed = true;
        attackResult += `${targetCard.name} destroyed!`;
      }

    } else {
      // Direct attack - no reductions for player attacks
      attackResult += `Direct attack for ${finalDamage} damage to player.`;
    }

    return {
      success: true,
      damageDealt: finalDamage,
      isCritical,
      cardDestroyed,
      attackResult
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

