//! Greedy bot — difficulty MEDIUM.
//!
//! Uses a one-level look-ahead: win immediately if possible, block an
//! immediate opponent win, otherwise pick the move with the best
//! connectivity score.

use crate::{Coordinates, GameStatus, GameY, Movement, PlayerId};
use super::{YBot, utils};

pub struct GreedyBot {
    player_idx: u32,
}

impl GreedyBot {
    pub fn new(player_idx: u32) -> Self {
        Self { player_idx }
    }

    /// Returns the first move in `available` that immediately ends the game
    /// with `player_id` as winner, or `None` if no such move exists.
    fn find_winning_move(&self, board: &GameY, player_id: u32) -> Option<Coordinates> {
        let size = board.board_size();
        board.available_cells().iter().find_map(|&idx| {
            let coords = Coordinates::from_index(idx, size);
            let mut sim = board.clone();
            sim.add_move(Movement::Placement {
                player: PlayerId::new(player_id),
                coords,
            }).ok()?;
            match sim.status() {
                GameStatus::Finished { winner } if winner.id() == player_id => Some(coords),
                _ => None,
            }
        })
    }

    /// Returns the move that maximises connectivity score for `self.player_idx`.
    fn best_greedy_move(&self, board: &GameY) -> Option<Coordinates> {
        let size = board.board_size();
        board
            .available_cells()
            .iter()
            .filter_map(|&idx| {
                let coords = Coordinates::from_index(idx, size);
                let mut sim = board.clone();
                sim.add_move(Movement::Placement {
                    player: PlayerId::new(self.player_idx),
                    coords,
                }).ok()?;
                let score = utils::evaluate(&sim, self.player_idx);
                Some((coords, score))
            })
            .max_by_key(|&(_, score)| score)
            .map(|(coords, _)| coords)
    }
}

impl YBot for GreedyBot {
    fn name(&self) -> &str {
        "greedy_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let opp = 1 - self.player_idx;

        // ① Win immediately if possible
        if let Some(mv) = self.find_winning_move(board, self.player_idx) {
            return Some(mv);
        }

        // ② Block an immediate opponent win
        if let Some(mv) = self.find_winning_move(board, opp) {
            return Some(mv);
        }

        // ③ Best greedy move by connectivity score
        self.best_greedy_move(board).or_else(|| {
            board
                .available_cells()
                .first()
                .map(|&i| Coordinates::from_index(i, board.board_size()))
        })
    }
}