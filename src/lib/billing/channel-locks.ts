/** Com assinatura ativa os canais ficam liberados para o próprio cliente gerenciar. */
export function areChannelsLocked(_isActive: boolean) {
  return false;
}
