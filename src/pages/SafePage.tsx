const SafePage = () => {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", lineHeight: 1.6, color: '#333', backgroundColor: '#ffffff', margin: 0, padding: 0, minHeight: '100vh' }}>
      <header style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)', color: '#000', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '2.5em', marginBottom: '10px', fontWeight: 700 }}>⚽ Curiosidades da Camisa da Seleção Brasileira</h1>
        <p style={{ fontSize: '1.1em', opacity: 0.9 }}>Conheça a história e os fatos interessantes por trás do uniforme mais icônico do futebol</p>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        {[
          {
            title: 'A Camisa Branca Original',
            text: (
              <>
                Inicialmente, a Seleção Brasileira jogava com uma <span style={{ backgroundColor: '#fffacd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>camisa branca</span>. Essa cor foi utilizada nas primeiras Copas do Mundo, como em 1930, 1934 e 1938. No entanto, após a traumática derrota na final da Copa do Mundo de 1950, conhecida como <span style={{ backgroundColor: '#fffacd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>"Maracanaço"</span>, a camisa branca passou a ser vista como um símbolo de azar e foi aposentada.
              </>
            ),
            source: 'Netshoes - História da Camisa da Seleção Brasileira',
            url: 'https://www.netshoes.com.br/blog/uncategorized/post/historia-da-camisa-da-selecao-brasileira',
          },
          {
            title: 'O Nascimento da "Amarelinha"',
            text: (
              <>
                Em 1953, um concurso foi lançado pelo jornal <span style={{ backgroundColor: '#fffacd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>"Correio da Manhã"</span> para escolher um novo uniforme que representasse as cores da bandeira brasileira. O design vencedor foi o de <span style={{ backgroundColor: '#fffacd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>Aldyr Garcia Schlee</span>, um jovem gaúcho, que propôs a camisa amarela com detalhes verdes, calções azuis e meias brancas. A <span style={{ backgroundColor: '#fffacd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>"Amarelinha"</span> estreou em 1954 e rapidamente se tornou um símbolo de sucesso e identidade nacional.
              </>
            ),
            source: 'Google Arts & Culture - A História da Camisa Canarinho',
            url: 'https://artsandculture.google.com/story/DQWBCiIxN2jqKQ?hl=pt-br',
          },
          {
            title: 'A Mística da Camisa Azul',
            text: (
              <>
                A camisa azul, hoje o uniforme reserva tradicional, também tem uma história curiosa. Ela surgiu por acaso na final da Copa do Mundo de 1958, na Suécia. O Brasil e a Suécia, ambos com uniformes amarelos, precisavam de uma cor alternativa. A delegação brasileira não tinha um segundo uniforme, então a equipe de costureiras locais improvisou camisas azuis com os escudos da CBD costurados. Com essa camisa, o Brasil conquistou seu <span style={{ backgroundColor: '#fffacd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>primeiro título mundial</span>, e a camisa azul ganhou uma mística especial.
              </>
            ),
            source: 'Goal.com - A Mística da Camisa Azul',
            url: 'https://www.goal.com/br/listas/mistica-camisa-azul-historia-uniforme-mudou-historia-selecao-renova-sonho-hexa/bltd869a59cd1f567a1',
          },
          {
            title: 'Evolução e Detalhes',
            text: (
              <>
                Ao longo dos anos, a camisa da Seleção passou por diversas evoluções em design, tecidos e detalhes, mas as cores <span style={{ backgroundColor: '#fffacd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>amarela e azul</span> permaneceram como as principais. Cada Copa do Mundo e período trouxe pequenas alterações, mas a essência da "Amarelinha" e da camisa azul se manteve, representando a paixão e a história do futebol brasileiro. Hoje, a camisa da Seleção é um dos uniformes mais reconhecidos e respeitados em todo o mundo.
              </>
            ),
            source: 'Wikipédia - Uniformes da Seleção Brasileira de Futebol',
            url: 'https://pt.wikipedia.org/wiki/Uniformes_da_Sele%C3%A7%C3%A3o_Brasileira_de_Futebol',
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '40px', padding: '25px', backgroundColor: '#f9f9f9', borderLeft: '4px solid #FFD700', borderRadius: '4px' }}>
            <h2 style={{ color: '#1a1a1a', marginBottom: '15px', fontSize: '1.6em', borderBottom: '2px solid #FFD700', paddingBottom: '10px' }}>{section.title}</h2>
            <p style={{ marginBottom: '12px', textAlign: 'justify', fontSize: '1em' }}>{section.text}</p>
            <div style={{ fontSize: '0.85em', color: '#666', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
              Fonte: <a href={section.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>{section.source}</a>
            </div>
          </div>
        ))}
      </div>

      <footer style={{ backgroundColor: '#f0f0f0', color: '#666', textAlign: 'center', padding: '20px', marginTop: '40px', fontSize: '0.9em', borderTop: '1px solid #ddd' }}>
        <p>&copy; 2026 Curiosidades da Camisa do Brasil. Todos os direitos reservados.</p>
        <p>Página informativa sobre a história do futebol brasileiro.</p>
      </footer>
    </div>
  );
};

export default SafePage;
