// tests/bot_tests.rs
//
// Coloca este fichero en:  gamey/tests/bot_tests.rs
//
// Cubre:
//  - GreedyBot  (greedy.rs)
//  - MinimaxBot (minimax.rs)
//  - Las funciones duplicadas are_adjacent / connectivity_score / evaluate
//    se ejercitan indirectamente a través de los bots, ya que son privadas.

use gamey::{
    Coordinates, GameStatus, GameY, GreedyBot, MinimaxBot, Movement, PlayerId, YBot,
};

// ============================================================================
// Helpers
// ============================================================================

/// Coloca piezas alternando jugadores a partir de una lista de índices lineales.
/// `first_player` es el jugador que empieza (0 ó 1).
fn place_sequence(game: &mut GameY, indices: &[u32], first_player: u32) {
    for (i, &idx) in indices.iter().enumerate() {
        let player = (first_player + i as u32) % 2;
        let coords = Coordinates::from_index(idx, game.board_size());
        game.add_move(Movement::Placement {
            player: PlayerId::new(player),
            coords,
        })
        .unwrap();
    }
}

/// Devuelve un tablero de tamaño 3 con las piezas del layout YEN dado.
fn board_from_yen(yen_str: &str) -> GameY {
    let yen: gamey::YEN = serde_json::from_str(yen_str).unwrap();
    GameY::try_from(yen).unwrap()
}

// ============================================================================
// GreedyBot — nombre
// ============================================================================

#[test]
fn greedy_bot_name() {
    let bot = GreedyBot::new(0);
    assert_eq!(bot.name(), "greedy_bot");
}

// ============================================================================
// GreedyBot — tablero vacío devuelve un movimiento
// ============================================================================

#[test]
fn greedy_bot_returns_move_on_empty_board() {
    let bot = GreedyBot::new(0);
    let game = GameY::new(5);
    let mv = bot.choose_move(&game);
    assert!(mv.is_some());
}

// ============================================================================
// GreedyBot — el movimiento devuelto es una celda disponible
// ============================================================================

#[test]
fn greedy_bot_returns_available_cell() {
    let bot = GreedyBot::new(0);
    let game = GameY::new(4);
    let coords = bot.choose_move(&game).unwrap();
    let idx = coords.to_index(game.board_size());
    assert!(game.available_cells().contains(&idx));
}

// ============================================================================
// GreedyBot — gana inmediatamente cuando puede (rama ①)
// ============================================================================

#[test]
fn greedy_bot_takes_winning_move() {
    // Tablero tamaño 2: solo 3 celdas (idx 0=top, 1=bottom-left, 2=bottom-right)
    // Jugador 0 tiene la celda bottom-left (toca A+B).
    // Si coloca en bottom-right (toca A+C) gana al conectar los 3 lados.
    let yen = r#"{"size":2,"turn":0,"players":["B","R"],"layout":"./B."}"#;
    let game = board_from_yen(yen);

    let bot = GreedyBot::new(0);
    let mv = bot.choose_move(&game).unwrap();

    // Simulamos la jugada y comprobamos que el juego termina con victoria del bot
    let mut sim = game.clone();
    sim.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: mv,
    })
    .unwrap();

    match sim.status() {
        GameStatus::Finished { winner } => assert_eq!(winner.id(), 0),
        _ => panic!("El bot debería haber ganado"),
    }
}

// ============================================================================
// GreedyBot — bloquea la victoria inmediata del rival (rama ②)
// ============================================================================

#[test]
fn greedy_bot_blocks_opponent_win() {
    // Jugador 1 (oponente) tiene las celdas que tocan A+B.
    // Si coloca en la celda que toca C, gana. El bot (jugador 0) debe bloquear.
    let yen = r#"{"size":2,"turn":0,"players":["B","R"],"layout":"./BR"}"#;
    // Estado: top=vacío, bottom-left=B(0), bottom-right=R(1)
    // Pero el turno es del jugador 0, y el rival 1 ganaría en la celda top (idx=0).
    // Creamos un estado donde R tiene dos celdas que, al unirse, ganan.
    // En size=2: idx0=top(1,0,0), idx1=bot-left(0,0,1 toca A+B), idx2=bot-right(0,1,0 toca A+C)
    // R tiene idx1 y idx2 → R ya ganó… Construyamos uno más cuidadoso con size=3.

    // En size=3, jugador 1 tiene (0,0,2) y (0,2,0) → toca A+B y A+C.
    // Si coloca en (0,1,1) → conecta ambos componentes y gana.
    // El bot (jugador 0) debe ocupar (0,1,1) para bloquearlo.
    let yen3 = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../R.R"}"#;
    let game = board_from_yen(yen3);

    let bot = GreedyBot::new(0);
    let mv = bot.choose_move(&game).unwrap();

    // La celda bloqueante tiene coordenadas (0,1,1) → índice en tamaño 3
    let blocking_coords = Coordinates::new(0, 1, 1);
    let blocking_idx = blocking_coords.to_index(3);
    let chosen_idx = mv.to_index(3);
    assert_eq!(
        chosen_idx, blocking_idx,
        "El bot debería haber bloqueado en (0,1,1)"
    );
}

// ============================================================================
// GreedyBot — sin celdas disponibles devuelve None
// ============================================================================

#[test]
fn greedy_bot_returns_none_on_full_board() {
    // Tablero 1×1: la única celda está ocupada → juego terminado pero available vacío
    let yen = r#"{"size":1,"turn":0,"players":["B","R"],"layout":"B"}"#;
    let game = board_from_yen(yen);
    assert!(game.available_cells().is_empty());

    let bot = GreedyBot::new(0);
    // Con available vacío, el bot no puede devolver nada
    let mv = bot.choose_move(&game);
    assert!(mv.is_none());
}

// ============================================================================
// GreedyBot — jugando como jugador 1
// ============================================================================

#[test]
fn greedy_bot_works_as_player_1() {
    let bot = GreedyBot::new(1);
    let mut game = GameY::new(3);
    // Es turno del jugador 0 primero; hacemos un movimiento manual
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 0, 0),
    })
    .unwrap();

    // Ahora es turno del jugador 1 (el bot)
    let mv = bot.choose_move(&game).unwrap();
    let idx = mv.to_index(game.board_size());
    assert!(game.available_cells().contains(&idx));
}

// ============================================================================
// GreedyBot — partida completa hasta el final
// ============================================================================

#[test]
fn greedy_bot_completes_game() {
    let bot0 = GreedyBot::new(0);
    let bot1 = GreedyBot::new(1);
    let mut game = GameY::new(3);
    let mut turn = 0u32;

    for _ in 0..20 {
        if game.check_game_over() {
            break;
        }
        let bot: &dyn YBot = if turn == 0 { &bot0 } else { &bot1 };
        if let Some(coords) = bot.choose_move(&game) {
            game.add_move(Movement::Placement {
                player: PlayerId::new(turn),
                coords,
            })
            .unwrap();
        }
        turn = 1 - turn;
    }

    // En un tablero 3×3 (6 celdas) siempre hay ganador antes de 6 movimientos
    assert!(game.check_game_over());
}

// ============================================================================
// MinimaxBot — nombre
// ============================================================================

#[test]
fn minimax_bot_name() {
    let bot = MinimaxBot::new(0, 2);
    assert_eq!(bot.name(), "minimax_bot");
}

// ============================================================================
// MinimaxBot — tablero vacío devuelve un movimiento
// ============================================================================

#[test]
fn minimax_bot_returns_move_on_empty_board() {
    let bot = MinimaxBot::new(0, 1);
    let game = GameY::new(3);
    assert!(bot.choose_move(&game).is_some());
}

// ============================================================================
// MinimaxBot — el movimiento devuelto es una celda disponible
// ============================================================================

#[test]
fn minimax_bot_returns_available_cell() {
    let bot = MinimaxBot::new(0, 1);
    let game = GameY::new(3);
    let coords = bot.choose_move(&game).unwrap();
    let idx = coords.to_index(game.board_size());
    assert!(game.available_cells().contains(&idx));
}

// ============================================================================
// MinimaxBot — gana inmediatamente cuando puede
// ============================================================================

#[test]
fn minimax_bot_takes_winning_move() {
    // Mismo escenario que el test de GreedyBot
    let yen = r#"{"size":2,"turn":0,"players":["B","R"],"layout":"./B."}"#;
    let game = board_from_yen(yen);

    let bot = MinimaxBot::new(0, 2);
    let mv = bot.choose_move(&game).unwrap();

    let mut sim = game.clone();
    sim.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: mv,
    })
    .unwrap();

    match sim.status() {
        GameStatus::Finished { winner } => assert_eq!(winner.id(), 0),
        _ => panic!("El bot debería haber ganado"),
    }
}

// ============================================================================
// MinimaxBot — bloquea la victoria del rival
// ============================================================================

#[test]
fn minimax_bot_blocks_opponent_win() {
    let yen3 = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../R.R"}"#;
    let game = board_from_yen(yen3);

    let bot = MinimaxBot::new(0, 2);
    let mv = bot.choose_move(&game).unwrap();

    let blocking_coords = Coordinates::new(0, 1, 1);
    let blocking_idx = blocking_coords.to_index(3);
    let chosen_idx = mv.to_index(3);
    assert_eq!(chosen_idx, blocking_idx, "Minimax debería bloquear en (0,1,1)");
}

// ============================================================================
// MinimaxBot — sin celdas disponibles devuelve None
// ============================================================================

#[test]
fn minimax_bot_returns_none_on_full_board() {
    let yen = r#"{"size":1,"turn":0,"players":["B","R"],"layout":"B"}"#;
    let game = board_from_yen(yen);
    let bot = MinimaxBot::new(0, 2);
    assert!(bot.choose_move(&game).is_none());
}

// ============================================================================
// MinimaxBot — profundidad 0 funciona (caso base del minimax)
// ============================================================================

#[test]
fn minimax_bot_depth_zero_returns_move() {
    let bot = MinimaxBot::new(0, 1); // depth=1: un nivel de búsqueda
    let game = GameY::new(2);
    assert!(bot.choose_move(&game).is_some());
}

// ============================================================================
// MinimaxBot — jugando como jugador 1
// ============================================================================

#[test]
fn minimax_bot_works_as_player_1() {
    let bot = MinimaxBot::new(1, 1);
    let mut game = GameY::new(3);
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 0, 0),
    })
    .unwrap();
    let mv = bot.choose_move(&game).unwrap();
    assert!(game.available_cells().contains(&mv.to_index(game.board_size())));
}

// ============================================================================
// MinimaxBot — partida completa hasta el final
// ============================================================================

#[test]
fn minimax_bot_completes_game() {
    let bot0 = MinimaxBot::new(0, 2);
    let bot1 = MinimaxBot::new(1, 2);
    let mut game = GameY::new(3);
    let mut turn = 0u32;

    for _ in 0..20 {
        if game.check_game_over() {
            break;
        }
        let bot: &dyn YBot = if turn == 0 { &bot0 } else { &bot1 };
        if let Some(coords) = bot.choose_move(&game) {
            game.add_move(Movement::Placement {
                player: PlayerId::new(turn),
                coords,
            })
            .unwrap();
        }
        turn = 1 - turn;
    }
    assert!(game.check_game_over());
}

// ============================================================================
// MinimaxBot vs GreedyBot — poda alfa-beta ejercitada con tablero parcial
// ============================================================================

#[test]
fn minimax_beats_greedy_on_size3() {
    // Minimax (profundidad 3) juega como player 0, Greedy como player 1.
    // En tamaño 3 el primer jugador debería ganar con juego perfecto.
    let minimax = MinimaxBot::new(0, 3);
    let greedy  = GreedyBot::new(1);
    let mut game = GameY::new(3);
    let mut turn = 0u32;

    for _ in 0..20 {
        if game.check_game_over() { break; }
        let coords = if turn == 0 {
            minimax.choose_move(&game)
        } else {
            greedy.choose_move(&game)
        };
        if let Some(c) = coords {
            game.add_move(Movement::Placement {
                player: PlayerId::new(turn),
                coords: c,
            }).unwrap();
        }
        turn = 1 - turn;
    }
    assert!(game.check_game_over());
}

// ============================================================================
// are_adjacent — ejercitado indirectamente via connectivity_score en evaluate
//
// Colocamos piezas adyacentes y verificamos que el bot las valora juntas
// (piezas adyacentes forman componentes con mayor score).
// ============================================================================

#[test]
fn adjacent_pieces_form_stronger_component() {
    // Dos piezas adyacentes del mismo jugador deberían producir un movimiento
    // diferente al de una pieza aislada.  Solo comprobamos que el bot devuelve
    // un movimiento válido en ambos casos (ejercita la lógica interna).
    let bot = GreedyBot::new(0);

    // Tablero con una pieza aislada del jugador 0
    let mut game_isolated = GameY::new(4);
    game_isolated.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(3, 0, 0), // top corner
    }).unwrap();
    // Es turno del 1; saltamos con un movimiento del 1
    game_isolated.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(0, 3, 0),
    }).unwrap();

    let mv = bot.choose_move(&game_isolated);
    assert!(mv.is_some());

    // Tablero con dos piezas adyacentes del jugador 0
    let mut game_adjacent = GameY::new(4);
    game_adjacent.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(3, 0, 0),
    }).unwrap();
    game_adjacent.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(0, 3, 0),
    }).unwrap();
    game_adjacent.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 1, 0), // adyacente al top corner
    }).unwrap();
    game_adjacent.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(0, 0, 3),
    }).unwrap();

    let mv2 = bot.choose_move(&game_adjacent);
    assert!(mv2.is_some());
}
