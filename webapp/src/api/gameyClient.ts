import { apiFetch, GAMEY_URL } from './api';

export interface Coordinates {
    x: number;
    y: number;
    z: number;
}

export interface YEN {
    size: number;
    turn: number;
    players: string[];
    layout: string;
}

export interface MoveResponse {
    api_version: string;
    bot_id: string;
    coords: Coordinates;
}

export interface GameStateResponse {
    yen: YEN;
    status: 'Ongoing' | 'Finished';
    winner?: number; // 0 o 1
}

export async function chooseMove(
    yen: YEN,
    botId: string = 'random_bot', // ID corregido según state.rs
    apiVersion: string = 'v1'
): Promise<MoveResponse> {
    const response = await apiFetch(`${GAMEY_URL}/${apiVersion}/ybot/choose/${botId}`, {
        method: 'POST',
        body: JSON.stringify(yen),
    });

    if (!response.ok) {
        // Intentamos extraer el mensaje de error definido en error.rs
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.statusText}`);
    }

    return response.json();
}

// NUEVA FUNCIÓN: Envía el movimiento del humano al servidor
export async function makeHumanMove(
    yen: YEN,
    coords: { x: number, y: number, z: number },
    playerIdx: number,
    apiVersion: string = 'v1'
): Promise<GameStateResponse> {
    const response = await apiFetch(`${GAMEY_URL}/${apiVersion}/game/play`, {
        method: 'POST',
        body: JSON.stringify({
            yen: yen,
            coords: coords,
            player_idx: playerIdx
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.statusText}`);
    }

    return response.json();
}