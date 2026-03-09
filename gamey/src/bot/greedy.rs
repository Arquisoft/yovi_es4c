use crate::{Coordinates, GameY, GameStatus, Movement, PlayerId};
use super::YBot;

pub struct GreedyBot {
    player_idx: u32,
}

impl GreedyBot {
    pub fn new(player_idx: u32) -> Self {
        Self { player_idx }
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
}

impl YBot for GreedyBot {
    fn name(&self) -> &str {
        "greedy_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        let mut best_score = i32::MIN;
        let mut best_move = None;

        for &cell_index in available_cells.iter() {
            let coords = Coordinates::from_index(cell_index, board.board_size());
            
            // Clonamos el tablero para simular el movimiento
            let mut simulated_board = board.clone();
            let movement = Movement::Placement {
                player: PlayerId::new(self.player_idx),
                coords: coords.clone(),
            };

            // Si el movimiento es válido, evaluamos cómo queda el tablero
            if simulated_board.add_move(movement).is_ok() {
                let score = self.evaluate(&simulated_board);

                if score > best_score || best_move.is_none() {
                    best_score = score;
                    best_move = Some(coords);
                }
            }
        }

        // Si por alguna razón no encontró nada, devolvemos la primera celda disponible
        best_move.or_else(|| {
            available_cells.first().map(|&idx| Coordinates::from_index(idx, board.board_size()))
        })
    }
}