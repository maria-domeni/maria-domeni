import type { Metadata } from "next";
import { Block, Contact, Controller, LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Domeni trata seus dados, de acordo com a LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Seus cadernos são seus. Esta política explica, em linguagem direta, quais dados o Domeni trata, por quê, com quem e quais são os seus direitos pela Lei Geral de Proteção de Dados (Lei 13.709/2018)."
    >
      <Block title="1. Quem é responsável">
        <p>
          O controlador dos dados é <Controller />. Para qualquer assunto de privacidade, inclusive exercer seus direitos,
          escreva para <Contact />.
        </p>
      </Block>

      <Block title="2. O que fica só no seu aparelho">
        <p>
          Por padrão, tudo o que você cria no Domeni (cadernos, aulas, escrita à mão, PDFs, imagens, gravações, notas,
          faltas, agenda) fica guardado <strong>no seu aparelho</strong>, no armazenamento do navegador ou do app. Nós não
          temos acesso a esse conteúdo enquanto você não ativar a sincronização.
        </p>
      </Block>

      <Block title="3. Dados que tratamos e por quê">
        <ul>
          <li>
            <strong>Conta</strong> (e-mail e, se você criar, senha protegida por criptografia): para você entrar e para
            prestarmos o serviço. Base legal: execução de contrato (art. 7º, V).
          </li>
          <li>
            <strong>Conteúdo sincronizado</strong> (só no Plus, quando a sincronização está ativa): uma cópia dos seus
            cadernos e arquivos na nuvem, para levar tudo entre aparelhos e servir de backup. Base legal: execução de contrato.
          </li>
          <li>
            <strong>Pedidos à IA</strong>: quando você toca num botão de IA, o trecho escolhido (por exemplo, as anotações de
            uma aula) é enviado para processamento e a resposta volta para você. Guardamos só a contagem de uso, o modelo e
            o número de tokens, para controlar a cota do plano. Base legal: execução de contrato.
          </li>
          <li>
            <strong>Pagamento</strong>: o pagamento é feito pelo Stripe (site) ou pela App Store / Google Play. Não
            recebemos nem guardamos o número do seu cartão. Guardamos o status da assinatura e o identificador do cliente.
            Base legal: execução de contrato e cumprimento de obrigação legal (art. 7º, II), como as obrigações fiscais.
          </li>
          <li>
            <strong>Lista de espera e e-mails</strong>: nome, e-mail e as respostas do formulário, para enviar o planner, as
            novidades e o aviso de lançamento. Base legal: consentimento (art. 7º, I), que você pode retirar a qualquer
            momento pelo link de descadastro ou pelo nosso e-mail.
          </li>
          <li>
            <strong>Registros de acesso</strong> (endereço IP, data e hora de login): por segurança e porque o Marco Civil da
            Internet (Lei 12.965/2014, art. 15) exige guardá-los por 6 meses. Base legal: obrigação legal e legítimo interesse
            na segurança (art. 7º, IX).
          </li>
        </ul>
      </Block>

      <Block title="4. Estágio e dados de terceiros">
        <p>
          O Domeni <strong>não deve</strong> ser usado para guardar nome ou qualquer dado que identifique a pessoa atendida
          em estágios. O app mostra esse aviso nas telas do estágio. Use iniciais trocadas ou descrições genéricas.
        </p>
      </Block>

      <Block title="5. Com quem compartilhamos">
        <p>Só com empresas que operam partes do serviço para nós, cada uma para a sua finalidade:</p>
        <ul>
          <li><strong>Supabase</strong>: banco de dados, contas e armazenamento de arquivos sincronizados.</li>
          <li><strong>Vercel</strong>: hospedagem do site e do servidor.</li>
          <li>
            <strong>Anthropic</strong>: processamento dos pedidos de IA. Pelos termos comerciais da Anthropic, o conteúdo
            enviado pela API não é usado para treinar os modelos dela.
          </li>
          <li><strong>Stripe</strong>: pagamentos no site (cartão e Pix).</li>
          <li><strong>Apple, Google e RevenueCat</strong>: assinaturas feitas pelos apps das lojas.</li>
          <li><strong>Brevo</strong>: envio de e-mails da lista (só se você se inscreveu).</li>
        </ul>
        <p>
          Algumas dessas empresas processam dados fora do Brasil (principalmente nos Estados Unidos). Essas transferências
          seguem o art. 33 da LGPD, com contratos que exigem proteção equivalente. Não vendemos dados, não exibimos anúncios
          e não usamos suas anotações para treinar inteligência artificial.
        </p>
      </Block>

      <Block title="6. Por quanto tempo guardamos">
        <ul>
          <li>Conta e conteúdo sincronizado: enquanto a conta existir.</li>
          <li>
            Conteúdo sincronizado de quem ficou sem o Plus: guardado por 180 dias para você poder voltar; depois disso pode ser
            apagado da nuvem (o que está no seu aparelho continua lá).
          </li>
          <li>Registros de acesso: 6 meses. Registros de pagamento: pelo prazo exigido pela legislação fiscal.</li>
          <li>Lista de e-mails: até você pedir para sair.</li>
        </ul>
      </Block>

      <Block title="7. Seus direitos">
        <p>
          Você pode, a qualquer momento: confirmar se tratamos seus dados, acessar, corrigir, pedir a exclusão, levar seus dados
          para outro serviço (em Ajustes › Seus dados há um backup completo), saber com quem compartilhamos, retirar o
          consentimento e reclamar à Autoridade Nacional de Proteção de Dados (ANPD). A exclusão da conta pode ser feita no
          próprio app, em Conta › Excluir conta. Pedidos por e-mail são respondidos em até 15 dias.
        </p>
      </Block>

      <Block title="8. Segurança">
        <p>
          Conexões sempre criptografadas, cada conta só acessa os próprios dados (regras no próprio banco de dados), chaves de
          acesso guardadas apenas no servidor e acesso administrativo restrito. Nenhum sistema é 100% invulnerável; se houver
          um incidente que possa trazer risco, avisaremos você e a ANPD.
        </p>
      </Block>

      <Block title="9. Cookies e armazenamento local">
        <p>
          Não usamos cookies de publicidade nem rastreadores de terceiros. O app usa o armazenamento do navegador para guardar
          seus cadernos, suas preferências e a sessão da conta, que são necessários para ele funcionar.
        </p>
      </Block>

      <Block title="10. Idade">
        <p>
          O Domeni é feito para estudantes de graduação. Se você tem menos de 18 anos, use com o conhecimento dos seus
          responsáveis, que devem fazer a assinatura paga.
        </p>
      </Block>

      <Block title="11. Mudanças nesta política">
        <p>Se esta política mudar de forma importante, avisaremos no app ou por e-mail antes de a mudança valer.</p>
      </Block>
    </LegalPage>
  );
}
