use crate::{Coordinates, GameY, YEN, check_api_version, error::ErrorResponse, Movement, PlayerId, GameStatus};
use axum::{
    Json,
    extract::Path,
};
use serde::{Deserialize, Serialize};

/// Parámetros de ruta (igual que en choose.rs para mantener consistencia)
#[derive(Deserialize)]
pub struct PlayParams {
    api_version: String,
}

/// Lo que el frontend envía para realizar un movimiento
#[derive(Deserialize, Debug)]
pub struct PlayRequest {
    /// El estado actual del juego antes del movimiento
    pub yen: YEN,
    /// Las coordenadas donde el jugador quiere mover
    pub coords: Coordinates,
    /// El índice del jugador (0 para Azul/B, 1 para Rojo/R)
    pub player_idx: u32,
}

/// Lo que respondemos al frontend
#[derive(Serialize, Debug)]
pub struct PlayResponse {
    /// El nuevo estado del juego (YEN)
    pub yen: YEN,
    /// Estado del juego: "Ongoing" o "Finished"
    pub status: String,
    /// ID del ganador si lo hay, o null si no
    pub winner: Option<u32>,
}

/// Handler para procesar un movimiento humano.
/// 
/// Valida las reglas, actualiza el tablero y comprueba si hay victoria.
/// Route: POST /{api_version}/game/play
#[axum::debug_handler]
pub async fn play(
    Path(params): Path<PlayParams>,
    Json(payload): Json<PlayRequest>,
) -> Result<Json<PlayResponse>, Json<ErrorResponse>> {
    // 1. Verificar versión de API
    check_api_version(&params.api_version)?;

    // 2. Reconstruir el juego desde el YEN recibido
    let mut game = match GameY::try_from(payload.yen) {
        Ok(g) => g,
        Err(e) => return Err(Json(ErrorResponse::error(
            &format!("Invalid YEN format: {}", e),
            Some(params.api_version),
            None
        ))),
    };

    // 3. Crear el movimiento
    let movement = Movement::Placement {
        player: PlayerId::new(payload.player_idx),
        coords: payload.coords,
    };

    // 4. Intentar aplicar el movimiento (Aquí Rust valida si es legal)
    if let Err(e) = game.add_move(movement) {
        return Err(Json(ErrorResponse::error(
            &format!("Illegal move: {}", e),
            Some(params.api_version),
            None
        )));
    }

    // 5. Preparar la respuesta con el nuevo estado
    let new_yen: YEN = (&game).into();
    
    let (status_str, winner_id) = match game.status() {
        GameStatus::Ongoing { .. } => ("Ongoing".to_string(), None),
        GameStatus::Finished { winner } => ("Finished".to_string(), Some(winner.id())),
    };

    Ok(Json(PlayResponse {
        yen: new_yen,
        status: status_str,
        winner: winner_id,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_play_response_serialization() {
        let response = PlayResponse {
            yen: YEN::new(1, 0, vec!['B', 'R'], "B".to_string()),
            status: "Finished".to_string(),
            winner: Some(0),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"status\":\"Finished\""));
        assert!(json.contains("\"winner\":0"));
    }
}