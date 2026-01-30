import { useEffect, useRef } from 'react';
export function useMountEffect(effect: () => void | (() => void)) {
    const hasRun = useRef(false);

    useEffect(() => {
    // Se já executou, não faz nada
    if (hasRun.current) return;
    
    // Marca como executado
    hasRun.current = true;

    // Executa o effect e retorna o cleanup (se houver)
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
}