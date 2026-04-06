//! Shared utilities for bot implementations.
//!
//! Contains the evaluation functions used by both [`GreedyBot`] and [`MinimaxBot`].

use crate::{Coordinates, GameStatus, GameY};

/// Returns true if two cells are adjacent on the triangular board.
///
/// In barycentric coordinates two cells are adjacent when exactly two
/// components differ by ±1, i.e. |Δx| + |Δy| + |Δz| == 2.
pub(super) fn are_adjacent(a: &Coordinates, b: &Coordinates) -> bool {
    let dx = (a.x() as i32 - b.x() as i32).abs();
    let dy = (a.y() as i32 - b.y() as i32).abs();
    let dz = (a.z() as i32 - b.z() as i32).abs();
    dx + dy + dz == 2
}

/// Score for a connected component based on how many board sides it touches.
fn component_score(n_sides: usize, comp_size: u32) -> i32 {
    match n_sides {
        3 => 50_000,
        2 => 3_000 + comp_size as i32 * 20,
        1 =>   200 + comp_size as i32 *  5,
        _ =>    10,
    }
}

/// Computes the connectivity score for `player_id`.
///
/// Iterates over each connected component with BFS and scores it
/// according to how many board sides it touches.
pub(super) fn connectivity_score(board: &GameY, player_id: u32, all_coords: &[Coordinates]) -> i32 {
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

        total += bfs_component_score(board, player_id, all_coords, &mut visited, start);
    }
    total
}

/// Runs BFS from `start`, marks visited nodes, and returns the score for that component.
fn bfs_component_score(
    board: &GameY,
    player_id: u32,
    all_coords: &[Coordinates],
    visited: &mut [bool],
    start: usize,
) -> i32 {
    let n = all_coords.len();
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
                && board.piece_at(&all_coords[ni]).map_or(false, |o| o.id() == player_id)
            {
                visited[ni] = true;
                stack.push(ni);
            }
        }
    }

    let n_sides = sides.iter().filter(|&&s| s).count();
    component_score(n_sides, comp_size)
}

/// Evaluates the board from the perspective of `player_id`.
///
/// Returns a large positive value for a win, large negative for a loss,
/// and a heuristic score (own connectivity minus 2× opponent connectivity)
/// for ongoing games.
pub(super) fn evaluate(board: &GameY, player_id: u32) -> i32 {
    match board.status() {
        GameStatus::Finished { winner } => {
            return if winner.id() == player_id { 100_000 } else { -100_000 };
        }
        GameStatus::Ongoing { .. } => {}
    }

    let all_coords = board_coords(board);
    let my_score  = connectivity_score(board, player_id,       &all_coords);
    let opp_score = connectivity_score(board, 1 - player_id,   &all_coords);
    my_score - 2 * opp_score
}

/// Precomputes all board coordinates for the given game.
pub(super) fn board_coords(board: &GameY) -> Vec<Coordinates> {
    let size  = board.board_size();
    let total = (size * (size + 1)) / 2;
    (0..total).map(|i| Coordinates::from_index(i, size)).collect()
}
