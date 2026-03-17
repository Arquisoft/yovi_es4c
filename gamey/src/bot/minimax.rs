// minimax_bot.rs  ─  Dificultad DIFÍCIL
// ─────────────────────────────────────────────────────────────────────────────
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

    #[inline]
    fn opp(&self) -> u32 {
        1 - self.player_idx
    }
}

// ─── Utilidades (idénticas a greedy_bot; extraer a utils.rs en producción) ───

fn are_adjacent(a: &Coordinates, b: &Coordinates) -> bool {
    let dx = (a.x() as i32 - b.x() as i32).abs();
    let dy = (a.y() as i32 - b.y() as i32).abs();
    let dz = (a.z() as i32 - b.z() as i32).abs();
    dx + dy + dz == 2
}

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

        let mut sides = [false; 3];
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

        let n_sides = sides.iter().filter(|&&s| s).count();
        total += match n_sides {
            3 => 50_000,
            2 => 3_000 + comp_size as i32 * 20,
            1 =>   200 + comp_size as i32 *  5,
            _ =>    10,
        };
    }
    total
}

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

    let my_score  = connectivity_score(board, player_id,     &all_coords);
    let opp_score = connectivity_score(board, 1 - player_id, &all_coords);
    my_score - 2 * opp_score
}

// ─── Ordenación de movimientos ─────────────────────────────────────────────

/// Ordena los movimientos para maximizar la eficiencia de la poda alfa-beta:
///   1. Movimientos ganadores inmediatos  → mayor valor α/β cuanto antes
///   2. Bloqueos inmediatos              → evitar derrota sin búsqueda profunda
///   3. Celdas adyacentes a piezas       → movimientos probablemente relevantes
///   4. Celdas aisladas                  → exploradas al final
fn order_moves(
    board: &GameY,
    player_id: u32,
    all_coords: &[Coordinates],
) -> Vec<u32> {
    let available = board.available_cells();
    let opp       = 1 - player_id;

    let mut wins   = Vec::new();
    let mut blocks = Vec::new();
    let mut near   = Vec::new();
    let mut other  = Vec::new();

    for &idx in available {
        let coords = &all_coords[idx as usize];

        // ¿Gana el jugador actual colocando aquí?
        let mut sim = board.clone();
        if sim
            .add_move(Movement::Placement {
                player: PlayerId::new(player_id),
                coords: coords.clone(),
            })
            .is_ok()
            && matches!(sim.status(), GameStatus::Finished { .. })
        {
            wins.push(idx);
            continue;
        }

        // ¿Ganaría el rival si coloca aquí? → hay que bloquearlo
        let mut sim2 = board.clone();
        if sim2
            .add_move(Movement::Placement {
                player: PlayerId::new(opp),
                coords: coords.clone(),
            })
            .is_ok()
            && matches!(sim2.status(), GameStatus::Finished { .. })
        {
            blocks.push(idx);
            continue;
        }

        // ¿Es vecina de alguna pieza ya colocada?
        if all_coords
            .iter()
            .any(|nc| board.piece_at(nc).is_some() && are_adjacent(coords, nc))
        {
            near.push(idx);
        } else {
            other.push(idx);
        }
    }

    wins.extend(blocks);
    wins.extend(near);
    wins.extend(other);
    wins
}

// ─── Minimax con poda alfa-beta ───────────────────────────────────────────

impl MinimaxBot {
    fn minimax(
        &self,
        board: &GameY,
        depth: u8,
        is_maximizing: bool,
        mut alpha: i32,
        mut beta: i32,
        all_coords: &[Coordinates], // Se precalcula una vez y se pasa hacia abajo
    ) -> i32 {
        if depth == 0 || matches!(board.status(), GameStatus::Finished { .. }) {
            return evaluate(board, self.player_idx);
        }

        let current_player = if is_maximizing { self.player_idx } else { self.opp() };
        let moves = order_moves(board, current_player, all_coords);
        let size  = board.board_size();

        if is_maximizing {
            let mut max_eval = i32::MIN;
            for idx in moves {
                let coords = Coordinates::from_index(idx, size);
                let mut sim = board.clone();
                if sim
                    .add_move(Movement::Placement {
                        player: PlayerId::new(self.player_idx),
                        coords,
                    })
                    .is_ok()
                {
                    let eval =
                        self.minimax(&sim, depth - 1, false, alpha, beta, all_coords);
                    max_eval = max_eval.max(eval);
                    alpha    = alpha.max(eval);
                    if beta <= alpha {
                        break; // Poda β
                    }
                }
            }
            max_eval
        } else {
            let mut min_eval = i32::MAX;
            for idx in moves {
                let coords = Coordinates::from_index(idx, size);
                let mut sim = board.clone();
                if sim
                    .add_move(Movement::Placement {
                        player: PlayerId::new(self.opp()),
                        coords,
                    })
                    .is_ok()
                {
                    let eval =
                        self.minimax(&sim, depth - 1, true, alpha, beta, all_coords);
                    min_eval = min_eval.min(eval);
                    beta     = beta.min(eval);
                    if beta <= alpha {
                        break; // Poda α
                    }
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
        let size  = board.board_size();
        let total = (size * (size + 1)) / 2;
        // Precalculamos las coordenadas una sola vez para toda la búsqueda
        let all_coords: Vec<Coordinates> =
            (0..total).map(|i| Coordinates::from_index(i, size)).collect();

        let ordered = order_moves(board, self.player_idx, &all_coords);
        let mut best_score = i32::MIN;
        let mut best_move  = None;

        for idx in ordered {
            let coords = Coordinates::from_index(idx, size);
            let mut sim = board.clone();
            if sim
                .add_move(Movement::Placement {
                    player: PlayerId::new(self.player_idx),
                    coords: coords.clone(),
                })
                .is_ok()
            {
                let score = self.minimax(
                    &sim,
                    self.depth - 1,
                    false,
                    i32::MIN,
                    i32::MAX,
                    &all_coords,
                );
                if score > best_score || best_move.is_none() {
                    best_score = score;
                    best_move  = Some(coords);
                    // Victoria garantizada: no hace falta seguir buscando
                    if best_score >= 100_000 {
                        break;
                    }
                }
            }
        }

        best_move.or_else(|| {
            board
                .available_cells()
                .first()
                .map(|&i| Coordinates::from_index(i, size))
        })
    }
}