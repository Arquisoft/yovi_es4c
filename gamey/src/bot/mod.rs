//! Bot module for the Game of Y.
//!
//! This module provides the infrastructure for creating and managing AI bots
//! that can play the Game of Y. It includes:
//!
//! - [`YBot`]         — Trait that defines the interface for all bots
//! - [`YBotRegistry`] — Registry for managing multiple bot implementations
//! - [`RandomBot`]    — Simple bot that makes random valid moves
//! - [`GreedyBot`]    — Medium-difficulty bot using one-level look-ahead
//! - [`MinimaxBot`]   — Hard bot using minimax with alpha-beta pruning

pub mod random;
pub mod ybot;
pub mod ybot_registry;
pub mod greedy;
pub mod minimax;
pub(self) mod utils; // shared evaluation utilities — not part of public API

pub use random::*;
pub use ybot::*;
pub use ybot_registry::*;
pub use greedy::*;
pub use minimax::*;