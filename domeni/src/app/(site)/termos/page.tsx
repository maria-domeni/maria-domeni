import NextLink from "next/link";
import type { Metadata } from "next";
import { Block, Contact, Controller, LegalPage } from "@/components/site/LegalPage";
import { AI_LIMITS, PRICES, TRIAL_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "As regras de uso do Domeni, planos, pagamento e responsabilidades.",
  alternates: { canonical: "/termos" },
};

export default function Termos() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="Estes termos explicam o que o Domeni oferece, como funcionam os planos e o que cada lado se compromete a fazer. Ao criar uma conta ou assinar, você concorda com eles."
    >
      <Block title="1. Quem somos">
        <p>
          O Domeni é oferecido por <Controller />. Contato: <Contact />.
        </p>
      </Block>

      <Block title="2. O serviço">
        <p>
          O Domeni é um app de organização de estudos: cadernos com texto e escrita à mão, biblioteca de arquivos, agenda,
          notas, faltas, revisões, registros de estágio e recursos de inteligência artificial que rodam apenas quando você pede.
          Ele pode ser usado sem conta, com tudo guardado no seu aparelho.
        </p>
      </Block>

      <Block title="3. Conta">
        <p>
          A conta usa seu e-mail (com código enviado por e-mail ou senha). Você é responsável por manter o acesso ao seu e-mail
          seguro. Avise-nos se suspeitar de uso indevido.
        </p>
      </Block>

      <Block title="4. Planos e pagamento">
        <ul>
          <li>
            <strong>Grátis</strong>: uso dos recursos locais e {AI_LIMITS.gratis.acao} ações de IA por mês com conta.
          </li>
          <li>
            <strong>Plus</strong>: {PRICES.mensal.label} por mês ou {PRICES.anual.label} por ano, com sincronização entre
            aparelhos, backup na nuvem e cotas maiores de IA ({AI_LIMITS.plus.acao} ações e {AI_LIMITS.plus.pesquisa} pesquisas
            a fundo por mês).
          </li>
          <li>
            Assinaturas no cartão renovam automaticamente ao fim de cada período, até você cancelar. A primeira assinatura no
            cartão pelo site pode ter {TRIAL_DAYS} dias de teste grátis: se você cancelar antes do fim do teste, nada é cobrado.
          </li>
          <li>O plano anual pago com Pix vale por 12 meses e não renova sozinho.</li>
          <li>
            Assinaturas feitas pela App Store ou pelo Google Play são cobradas e gerenciadas pela loja, com as regras dela.
          </li>
          <li>
            Se o preço mudar, avisaremos com pelo menos 30 dias de antecedência, e o novo valor só vale a partir da renovação
            seguinte.
          </li>
          <li>As cotas de IA renovam no dia 1º de cada mês (horário de Brasília) e não acumulam.</li>
        </ul>
      </Block>

      <Block title="5. Cancelamento e arrependimento">
        <p>
          Você pode cancelar quando quiser, sem multa. Também pode desistir em até 7 dias depois de um pagamento feito pelo site,
          com reembolso total (Código de Defesa do Consumidor, art. 49). Os detalhes estão na página{" "}
          <NextLink className="text-accent underline-offset-2 hover:underline" href="/cancelamento">Cancelamento e reembolso</NextLink>.
        </p>
      </Block>

      <Block title="6. Seu conteúdo">
        <p>
          Tudo o que você cria no Domeni é seu. Você nos autoriza apenas a guardar, copiar entre seus aparelhos e processar esse
          conteúdo na medida necessária para o serviço funcionar (por exemplo, sincronizar ou enviar um trecho para a IA quando
          você pede). Não usamos seu conteúdo para treinar IA, não o vendemos e não o mostramos a ninguém.
        </p>
      </Block>

      <Block title="7. Uso da inteligência artificial">
        <ul>
          <li>A IA pode errar. Confira as respostas, principalmente o que aparece marcado como complemento.</li>
          <li>Ela não substitui professoras, professores, orientação acadêmica nem supervisão de estágio.</li>
          <li>Não use o Domeni para fraude acadêmica, como entregar como seu um trabalho que a IA escreveu sem sua autoria real.</li>
        </ul>
      </Block>

      <Block title="8. O que não é permitido">
        <ul>
          <li>Guardar nome ou dado que identifique pacientes ou pessoas atendidas em estágio.</li>
          <li>Enviar conteúdo ilegal ou que viole direitos autorais de terceiros de forma não permitida pela lei.</li>
          <li>Tentar acessar dados de outras pessoas, contornar limites do plano ou sobrecarregar o serviço.</li>
          <li>Revender o acesso ou compartilhar a conta com outras pessoas.</li>
        </ul>
        <p>Se essas regras forem descumpridas, a conta pode ser suspensa, depois de aviso quando possível.</p>
      </Block>

      <Block title="9. Disponibilidade e backups">
        <p>
          Trabalhamos para o Domeni funcionar sempre, mas podem acontecer interrupções para manutenção ou por falhas de
          terceiros. Como o conteúdo fica no seu aparelho, recomendamos fazer backups em Ajustes › Seus dados, mesmo no Plus.
        </p>
      </Block>

      <Block title="10. Responsabilidade">
        <p>
          Respondemos pelos danos que causarmos, nos termos do Código de Defesa do Consumidor. Não respondemos por perdas
          causadas por uso em desacordo com estes termos, por falhas do seu aparelho ou navegador, ou por decisões acadêmicas
          tomadas com base em respostas da IA sem conferência.
        </p>
      </Block>

      <Block title="11. Mudanças e lei aplicável">
        <p>
          Podemos atualizar estes termos; mudanças importantes serão avisadas com antecedência no app ou por e-mail. Valem as
          leis brasileiras, e eventuais conflitos podem ser resolvidos no foro do seu domicílio.
        </p>
      </Block>
    </LegalPage>
  );
}
