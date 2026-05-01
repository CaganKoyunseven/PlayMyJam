import { subscribe, EventType } from '../event-bus';
import { supabase } from '../supabase';

export function initTokenObserver(): () => void {
  return subscribe<{ sessionId: string; amount: number }>(
    EventType.TOKEN_PURCHASED,
    async (event) => {
      const { sessionId, amount } = event.payload;

      const { data } = await supabase
        .from('token_balances')
        .select('balance')
        .eq('session_id', sessionId)
        .single();

      const current = data?.balance ?? 0;
      await supabase
        .from('token_balances')
        .upsert(
          { session_id: sessionId, balance: current + amount },
          { onConflict: 'session_id' }
        );
    }
  );
}
