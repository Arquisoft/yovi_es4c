// greedy_bot.rs  ─  Dificultad MEDIA
// ─────────────────────────────────────────────────────────────────────────────
use crate::{Coordinates, GameY, GameStatus, Movement, PlayerId};
use super::YBot;

pub struct GreedyBot {
    player_idx: u32,
}

impl GreedyBot {
    pub fn new(player_idx: u32) -> Self {
        Self { player_idx }
    }
}

// ─── Utilidades (repetidas en minimax_bot; lo ideal sería moverlas a utils.rs) ──

/// En coordenadas baricéntricas triangulares dos celdas son vecinas si
/// exactamente dos coordenadas difieren en ±1 y la tercera permanece igual,
/// es decir: |Δx| + |Δy| + |Δz| == 2.
fn are_adjacent(a: &Coordinates, b: &Coordinates) -> bool {
    let dx = (a.x() as i32 - b.x() as i32).abs();
    let dy = (a.y() as i32 - b.y() as i32).abs();
    let dz = (a.z() as i32 - b.z() as i32).abs();
    dx + dy + dz == 2
}

/// Calcula la puntuación de conectividad de `player_id`:
/// recorre cada componente conexa con BFS y la puntúa según cuántos lados toca.
fn connectivity_score(board: &GameY, player_id: u32, all_coords: &[Coordinates]) -> i32 {
    let n = all_coords.len();
    let mut visited = vec![false; n];
    let mut total = 0i32;

    for start in 0..n {
        if visited[start] {
            continue;
        }
        let Some(owner) = board.piece_at(&all_coords[start]) else {
            continue;
        };
        if owner.id() != player_id {
            continue;
        }

        // BFS sobre el componente conexo
        let mut sides = [false; 3]; // [side_a, side_b, side_c]
        let mut comp_size = 0u32;
        let mut stack = vec![start];
        visited[start] = true;

        while let Some(curr) = stack.pop() {
            let c = &all_coords[curr];
            if c.touches_side_a() { sides[0] = true; }
            if c.touches_side_b() { sides[1] = true; }
            if c.touches_side_c() { sides[2] = true; }
            comp_size += 1;

            for ni in 0..n {
                if !visited[ni]
                    && are_adjacent(c, &all_coords[ni])
                    && board
                        .piece_at(&all_coords[ni])
                        .map_or(false, |o| o.id() == player_id)
                {
                    visited[ni] = true;
                    stack.push(ni);
                }
            }
        }

        // Puntuación exponencial: conectar 3 lados = victoria inminente
        let n_sides = sides.iter().filter(|&&s| s).count();
        total += match n_sides {
            3 => 50_000,
            // Componente toca 2 lados: un solo movimiento puede ganar → muy peligroso
            2 => 3_000 + comp_size as i32 * 20,
            // Componente anclada a un lado
            1 =>   200 + comp_size as i32 *  5,
            // Pieza aislada sin contacto con ningún lado
            _ =>    10,
        };
    }
    total
}

/// Evalúa el tablero desde la perspectiva de `player_id`.
/// Pondera el bloqueo 2× más que el avance propio.
fn evaluate(board: &GameY, player_id: u32) -> i32 {
    match board.status() {
        GameStatus::Finished { winner } => {
            return if winner.id() == player_id { 100_000 } else { -100_000 };
        }
        GameStatus::Ongoing { .. } => {}
    }

    let size  = board.board_size();
    let total = (size * (size + 1)) / 2;
    let all_coords: Vec<Coordinates> =
        (0..total).map(|i| Coordinates::from_index(i, size)).collect();

    let my_score  = connectivity_score(board, player_id,       &all_coords);
    let opp_score = connectivity_score(board, 1 - player_id,   &all_coords);

    my_score - 2 * opp_score
}

// ─── Bot ─────────────────────────────────────────────────────────────────────

impl YBot for GreedyBot {
    fn name(&self) -> &str {
        "greedy_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available = board.available_cells();
        let size      = board.board_size();
        let opp       = 1 - self.player_idx;

        // ① ¿Podemos ganar ahora mismo?
        for &idx in available {
            let coords = Coordinates::from_index(idx, size);
            let mut sim = board.clone();
            if sim
                .add_move(Movement::Placement {
                    player: PlayerId::new(self.player_idx),
                    coords: coords.clone(),
                })
                .is_ok()
            {
                if let GameStatus::Finished { winner } = sim.status() {
                    if winner.id() == self.player_idx {
                        return Some(coords);
                    }
                }
            }
        }

        // ② ¿El rival gana en su siguiente turno? → bloqueamos
        for &idx in available {
            let coords = Coordinates::from_index(idx, size);
            let mut sim = board.clone();
            if sim
                .add_move(Movement::Placement {
                    player: PlayerId::new(opp),
                    coords: coords.clone(),
                })
                .is_ok()
            {
                if let GameStatus::Finished { winner } = sim.status() {
                    if winner.id() == opp {
                        return Some(coords);
                    }
                }
            }
        }

        // ③ Mejor movimiento según conectividad (greedy 1 nivel)
        let mut best_score = i32::MIN;
        let mut best_move  = None;

        for &idx in available {
            let coords = Coordinates::from_index(idx, size);
            let mut sim = board.clone();
            if sim
                .add_move(Movement::Placement {
                    player: PlayerId::new(self.player_idx),
                    coords: coords.clone(),
                })
                .is_ok()
            {
                let score = evaluate(&sim, self.player_idx);
                if score > best_score || best_move.is_none() {
                    best_score = score;
                    best_move  = Some(coords);
                }
            }
        }

        best_move.or_else(|| available.first().map(|&i| Coordinates::from_index(i, size)))
    }
}