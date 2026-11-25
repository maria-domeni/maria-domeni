import type { Metadata } from "next";
import { Block, Contact, LegalPage } from "@/components/site/LegalPage";
import { TRIAL_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Cancelamento e reembolso",
  description: "Como cancelar a assinatura do Domeni e pedir reembolso.",
  alternates: { canonical: "/cancelamento" },
};

export default function Cancelamento() {
  return (
    <LegalPage
      title="Cancelamento e reembolso"
      intro="Sem fidelidade, sem multa e sem letra miúda. Veja como cancelar e como pedir o dinheiro de volta."
    >
      <Block title="Como cancelar">
        <ul>
          <li>
            <strong>Assinou pelo site</strong>: no app, vá em Conta › Gerenciar assinatura › Cancelar. O cancelamento é
            imediato e não precisa falar com ninguém.
          </li>
          <li>
            <strong>Assinou pelo iPhone ou iPad</strong>: Ajustes › seu nome › Assinaturas › Domeni.
          </li>
          <li>
            <strong>Assinou pelo Android</strong>: Google Play › Pagamentos e assinaturas › Assinaturas › Domeni.
          </li>
        </ul>
      </Block>

      <Block title="Teste grátis">
        <p>
          Cancelou durante os {TRIAL_DAYS} dias de teste? Nada é cobrado. Avisamos por e-mail antes do fim do teste.
        </p>
      </Block>

      <Block title="Depois de cancelar">
        <ul>
          <li>Você continua com o Plus até o fim do período já pago e não há novas cobranças.</li>
          <li>Seus cadernos continuam no seu aparelho, no plano grátis.</li>
          <li>
            A cópia na nuvem fica guardada por 180 dias, caso você volte. Depois disso, pode ser apagada.
          </li>
        </ul>
      </Block>

      <Block title="Direito de arrependimento (7 dias)">
        <p>
          Pagou pelo site e se arrependeu? Você pode desistir em até 7 dias depois do pagamento, inclusive da primeira cobrança
          que acontece depois do teste grátis, e recebe <strong>100% do valor de volta</strong> (Código de Defesa do Consumidor,
          art. 49). Escreva para <Contact /> com o e-mail da sua conta. O reembolso volta pelo mesmo meio: no cartão, o estorno
          aparece em até duas faturas; no Pix, o valor volta para a conta que pagou.
        </p>
        <p>
          Compras feitas pela App Store ou pelo Google Play são reembolsadas pela própria loja (reportaproblem.apple.com ou a
          página de pedidos do Google Play). Se tiver qualquer dificuldade, fale com a gente que ajudamos.
        </p>
      </Block>

      <Block title="Renovação anual">
        <p>
          No plano anual no cartão, enviamos um lembrete por e-mail antes da renovação. O plano anual pago com Pix não renova
          sozinho.
        </p>
      </Block>

      <Block title="Problemas com pagamento">
        <p>
          Se uma cobrança falhar, tentamos de novo por alguns dias e avisamos você. Se não for possível cobrar, o plano volta
          para o grátis, sem perder o que está no seu aparelho.
        </p>
      </Block>
    </LegalPage>
  );
}
