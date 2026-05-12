import { RankPhase, RankTier } from './RankSystem';
import { GameRuleSystem, Position } from './GameRuleSystem';

export interface AIMove {
  row: number;
  col: number;
}

export interface AIStepMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

interface CandidateMove {
  row: number;
  col: number;
  score: number;
}

interface CandidateStepMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  score: number;
}

interface SimulateResult {
  board: number[][];
  kills: number;
}

interface AIDifficulty {
  captureWeight: number;
  dangerWeight: number;
  centerWeight: number;
  randomTopCount: number;
}

export class AIOpponentSystem {
  private static instance: AIOpponentSystem;
  private ruleSystem: GameRuleSystem;

  private constructor() {
    this.ruleSystem = GameRuleSystem.getInstance();
  }

  public static getInstance(): AIOpponentSystem {
    if (!AIOpponentSystem.instance) {
      AIOpponentSystem.instance = new AIOpponentSystem();
    }
    return AIOpponentSystem.instance;
  }

  public chooseMove(
    board: number[][],
    aiType: number,
    playerType: number,
    tier: RankTier,
    phase: RankPhase,
  ): AIMove | null {
    const empties = this.getEmptyCells(board);
    if (empties.length === 0) {
      return null;
    }

    const difficulty = this.getDifficulty(tier, phase);
    const candidates: CandidateMove[] = [];

    for (let i = 0; i < empties.length; i++) {
      const cell = empties[i];
      const aiResult = this.simulateMove(board, cell.row, cell.col, aiType);
      const opponentMaxKill = this.getMaxKillForSide(aiResult.board, playerType);
      const centerScore = this.getCenterScore(cell.row, cell.col);

      const score =
        aiResult.kills * difficulty.captureWeight
        - opponentMaxKill * difficulty.dangerWeight
        + centerScore * difficulty.centerWeight;

      candidates.push({
        row: cell.row,
        col: cell.col,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const topCount = Math.min(difficulty.randomTopCount, candidates.length);
    const pickIndex = Math.floor(Math.random() * topCount);
    const picked = candidates[pickIndex];

    return {
      row: picked.row,
      col: picked.col,
    };
  }

  public chooseStepMove(
    board: number[][],
    aiType: number,
    playerType: number,
    tier: RankTier,
    phase: RankPhase,
  ): AIStepMove | null {
    const legalMoves = this.getLegalStepMoves(board, aiType);
    if (legalMoves.length === 0) {
      return null;
    }

    const difficulty = this.getDifficulty(tier, phase);
    const candidates: CandidateStepMove[] = [];

    for (let i = 0; i < legalMoves.length; i++) {
      const move = legalMoves[i];
      const simulatedBoard = this.cloneBoard(board);
      simulatedBoard[move.fromRow][move.fromCol] = 0;

      const aiResult = this.simulateMove(simulatedBoard, move.toRow, move.toCol, aiType);
      const opponentMaxKill = this.getMaxKillForSide(aiResult.board, playerType);
      const centerScore = this.getCenterScore(move.toRow, move.toCol);

      const score =
        aiResult.kills * difficulty.captureWeight
        - opponentMaxKill * difficulty.dangerWeight
        + centerScore * difficulty.centerWeight;

      candidates.push({
        fromRow: move.fromRow,
        fromCol: move.fromCol,
        toRow: move.toRow,
        toCol: move.toCol,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const topCount = Math.min(difficulty.randomTopCount, candidates.length);
    const pickIndex = Math.floor(Math.random() * topCount);
    const picked = candidates[pickIndex];

    return {
      fromRow: picked.fromRow,
      fromCol: picked.fromCol,
      toRow: picked.toRow,
      toCol: picked.toCol,
    };
  }

  public shouldCapture(tier: RankTier, phase: RankPhase): boolean {
    const level = tier * 3 + phase;
    // 低段位存在一定概率放弃吃子，高段位几乎必吃
    const captureChance = Math.min(0.95, 0.55 + level * 0.02);
    return Math.random() < captureChance;
  }

  private getDifficulty(tier: RankTier, phase: RankPhase): AIDifficulty {
    const level = tier * 3 + phase; // 0 ~ 20

    return {
      captureWeight: 9 + level * 0.9,
      dangerWeight: 5 + level * 0.8,
      centerWeight: 2 + level * 0.15,
      // 低段位随机性更大，高段位更接近最优
      randomTopCount: Math.max(1, 5 - Math.floor(level / 5)),
    };
  }

  private simulateMove(board: number[][], row: number, col: number, pieceType: number): SimulateResult {
    const copiedBoard = this.cloneBoard(board);
    copiedBoard[row][col] = pieceType;

    const list = this.boardToPieceList(copiedBoard);
    const current: Position = {
      point: [row, col],
      type: pieceType,
    };

    const kills = this.ruleSystem.checkKill(current, list);
    for (let i = 0; i < kills.length; i++) {
      const p = kills[i];
      copiedBoard[p.point[0]][p.point[1]] = 0;
    }

    return {
      board: copiedBoard,
      kills: kills.length,
    };
  }

  private getMaxKillForSide(board: number[][], pieceType: number): number {
    const empties = this.getEmptyCells(board);
    let maxKill = 0;

    for (let i = 0; i < empties.length; i++) {
      const cell = empties[i];
      const result = this.simulateMove(board, cell.row, cell.col, pieceType);
      if (result.kills > maxKill) {
        maxKill = result.kills;
      }
    }

    return maxKill;
  }

  private getCenterScore(row: number, col: number): number {
    // 4x4 棋盘中心偏好：中间四点分更高
    const centerTargets = [
      [1, 1], [1, 2], [2, 1], [2, 2],
    ];

    for (let i = 0; i < centerTargets.length; i++) {
      if (centerTargets[i][0] === row && centerTargets[i][1] === col) {
        return 2;
      }
    }

    const edge = row === 0 || row === 3 || col === 0 || col === 3;
    return edge ? 0.5 : 1;
  }

  private getEmptyCells(board: number[][]): Array<{ row: number; col: number }> {
    const cells: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] === 0) {
          cells.push({ row, col });
        }
      }
    }

    return cells;
  }

  private getLegalStepMoves(board: number[][], pieceType: number): AIStepMove[] {
    const moves: AIStepMove[] = [];
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] !== pieceType) continue;

        for (let i = 0; i < dirs.length; i++) {
          const nextRow = row + dirs[i][0];
          const nextCol = col + dirs[i][1];
          if (nextRow < 0 || nextRow >= 4 || nextCol < 0 || nextCol >= 4) continue;
          if (board[nextRow][nextCol] !== 0) continue;

          moves.push({
            fromRow: row,
            fromCol: col,
            toRow: nextRow,
            toCol: nextCol,
          });
        }
      }
    }

    return moves;
  }

  private boardToPieceList(board: number[][]): Position[] {
    const list: Position[] = [];

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const type = board[row][col];
        if (type !== 0) {
          list.push({
            point: [row, col],
            type,
          });
        }
      }
    }

    return list;
  }

  private cloneBoard(board: number[][]): number[][] {
    const copied: number[][] = [];

    for (let i = 0; i < board.length; i++) {
      copied[i] = [];
      for (let j = 0; j < board[i].length; j++) {
        copied[i][j] = board[i][j];
      }
    }

    return copied;
  }
}
