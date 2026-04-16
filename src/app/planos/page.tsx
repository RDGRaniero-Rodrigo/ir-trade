import "./planos.css";

export default function PlanosPage() {
  return (
    <main className="planos-page">
      <div className="planos-header">
        <h1>Escolha seu plano</h1>
        <p>Automatize o cálculo do seu IR com suporte a corretoras brasileiras e internacionais.</p>
      </div>

      <div className="planos-grid">
        {/* PLANO MENSAL */}
        <div className="plano-card">
          <div className="plano-badge">Mensal</div>
          <div className="plano-preco">
            <span className="cifrao">R$</span>
            <span className="valor">19</span>
            <span className="centavos">,90</span>
            <span className="periodo">/mês</span>
          </div>

          <ul className="plano-features">
            <li>
              <span className="check">✓</span>
              Notas de corretagem B3
            </li>
            <li className="sub-item">
              <span className="dot">•</span> XP Investimentos
            </li>
            <li className="sub-item">
              <span className="dot">•</span> Rico
            </li>
            <li className="sub-item">
              <span className="dot">•</span> Clear
            </li>
            <li>
              <span className="check">✓</span>
              E-mails de corretoras Forex
            </li>
            <li>
              <span className="check">✓</span>
              Cálculo automático de IR
            </li>
            <li>
              <span className="check">✓</span>
              Resumo mensal das operações
            </li>
            <li>
              <span className="check">✓</span>
              Dashboard Brasil / B3 e Forex
            </li>
          </ul>

          <a href="/checkout?plano=mensal" className="plano-btn outline">
            Assinar Mensal
          </a>
        </div>

        {/* PLANO ANUAL */}
        <div className="plano-card destaque">
          <div className="plano-popular">🏆 Mais Popular</div>
          <div className="plano-badge verde">Anual</div>
          <div className="plano-preco">
            <span className="cifrao">R$</span>
            <span className="valor">99</span>
            <span className="centavos">,90</span>
            <span className="periodo">/ano</span>
          </div>
          <div className="plano-economia">
            Economia de R$ 138,90 vs mensal 🎉
          </div>

          <ul className="plano-features">
            <li>
              <span className="check">✓</span>
              Notas de corretagem B3
            </li>
            <li className="sub-item">
              <span className="dot">•</span> XP Investimentos
            </li>
            <li className="sub-item">
              <span className="dot">•</span> Rico
            </li>
            <li className="sub-item">
              <span className="dot">•</span> Clear
            </li>
            <li>
              <span className="check">✓</span>
              E-mails de corretoras Forex
            </li>
            <li>
              <span className="check">✓</span>
              Cálculo automático de IR
            </li>
            <li>
              <span className="check">✓</span>
              Resumo mensal das operações
            </li>
            <li>
              <span className="check">✓</span>
              Dashboard Brasil / B3 e Forex
            </li>
            <li>
              <span className="check">✓</span>
              Suporte prioritário
            </li>
          </ul>

          <a href="/checkout?plano=anual" className="plano-btn verde">
            Assinar Anual
          </a>
        </div>
      </div>

      <p className="planos-footer">
        Cancele quando quiser. Sem taxas ocultas.
      </p>
    </main>
  );
}
