use crate::{Coordinates, GameY, GameStatus, Movement, PlayerId};
use super::YBot;

pub struct MinimaxBot {
    player_idx: u32,
    depth: u8,
}

impl MinimaxBot {
    pub fn new(player_idx: u32, depth: u8) -> Self {
        Self { player_idx, depth }
    }

    fn evaluate(&self, board: &GameY) -> i32 {
        // 1. Condición absoluta: Si el juego terminó, damos una puntuación extrema
        match board.status() {
            GameStatus::Finished { winner } => {
                if winner.id() == self.player_idx {
                    return 100_000; // ¡Victoria inminente!
                } else {
                    return -100_000; // ¡Derrota inminente!
                }
            },
            GameStatus::Ongoing { .. } => {} // Continuamos evaluando
        }

        let mut score = 0;
        let size = board.board_size();
        let total_cells = (size * (size + 1)) / 2;

        // 2. Evaluamos la posición táctica de todas las piezas en el tablero
        for idx in 0..total_cells {
            let coords = Coordinates::from_index(idx, size);
            
            if let Some(owner) = board.piece_at(&coords) {
                // --- HEURÍSTICA DE POSICIÓN ---
                
                // A) Control del Centro: x * y * z maximiza el valor en el centro del tablero
                let center_weight = (coords.x() * coords.y() * coords.z()) as i32;
                
                // B) Conexión a Bordes: Damos puntos si la pieza toca algún lado
                let mut edge_weight = 0;
                if coords.touches_side_a() { edge_weight += 5; }
                if coords.touches_side_b() { edge_weight += 5; }
                if coords.touches_side_c() { edge_weight += 5; }

                // Valor total de esta casilla específica
                let cell_value = center_weight + edge_weight;

                // Sumamos si es nuestra pieza, restamos si es del rival
                if owner.id() == self.player_idx {
                    score += cell_value;
                } else {
                    score -= cell_value;
                }
            }
        }

        score
    }

    fn minimax(&self, board: &GameY, depth: u8, is_maximizing: bool, mut alpha: i32, mut beta: i32) -> i32 {
        if depth == 0 || matches!(board.status(), GameStatus::Finished { .. }) {
            return self.evaluate(board);
        }

        let available_cells = board.available_cells();
        
        if is_maximizing {
            let mut max_eval = i32::MIN;
            for &cell_index in available_cells.iter() {
                let coords = Coordinates::from_index(cell_index, board.board_size());
                let mut sim_board = board.clone();
                
                if sim_board.add_move(Movement::Placement { player: PlayerId::new(self.player_idx), coords }).is_ok() {
                    let eval = self.minimax(&sim_board, depth - 1, false, alpha, beta);
                    max_eval = max_eval.max(eval);
                    alpha = alpha.max(eval);
                    if beta <= alpha { break; } // Poda Alpha-Beta
                }
            }
            max_eval
        } else {
            let mut min_eval = i32::MAX;
            let opponent_idx = 1 - self.player_idx; // Asumimos que el oponente es 0 si el bot es 1
            for &cell_index in available_cells.iter() {
                let coords = Coordinates::from_index(cell_index, board.board_size());
                let mut sim_board = board.clone();
                
                if sim_board.add_move(Movement::Placement { player: PlayerId::new(opponent_idx), coords }).is_ok() {
                    let eval = self.minimax(&sim_board, depth - 1, true, alpha, beta);
                    min_eval = min_eval.min(eval);
                    beta = beta.min(eval);
                    if beta <= alpha { break; } // Poda Alpha-Beta
                }
            }
            min_eval
        }
    }
}

impl YBot for MinimaxBot {
    fn name(&self) -> &str {
        "minimax_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        let mut best_score = i32::MIN;
        let mut best_move = None;

        for &cell_index in available_cells.iter() {
            let coords = Coordinates::from_index(cell_index, board.board_size());
            let mut simulated_board = board.clone();
            
            let movement = Movement::Placement {
                player: PlayerId::new(self.player_idx),
                coords: coords.clone(),
            };

            if simulated_board.add_move(movement).is_ok() {
                // Evaluamos asumiendo que el siguiente turno es del oponente (false = minimizing)
                let score = self.minimax(&simulated_board, self.depth - 1, false, i32::MIN, i32::MAX);

                if score > best_score || best_move.is_none() {
                    best_score = score;
                    best_move = Some(coords);
                }
            }
        }

        best_move.or_else(|| {
            available_cells.first().map(|&idx| Coordinates::from_index(idx, board.board_size()))
        })
    }
}