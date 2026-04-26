const SafePage = () => {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", lineHeight: 1.6, color: '#333', backgroundColor: '#ffffff', margin: 0, padding: 0, minHeight: '100vh' }}>
      <header style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)', color: '#fff', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '2.5em', marginBottom: '10px', fontWeight: 700 }}>💪 Wissenswertes über Nahrungsergänzungsmittel</h1>
        <p style={{ fontSize: '1.1em', opacity: 0.9 }}>Entdecke Fakten und wissenschaftliche Erkenntnisse rund um Fitness-Supplements</p>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        {[
          {
            title: 'Whey Protein – Der Klassiker',
            text: (
              <>
                <span style={{ backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>Whey Protein</span> ist das meistverkaufte Supplement weltweit. Es wird aus Molke gewonnen, einem Nebenprodukt der Käseherstellung. Whey Protein zeichnet sich durch seine schnelle Aufnahme und seinen hohen Gehalt an <span style={{ backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>essentiellen Aminosäuren</span> aus, insbesondere an BCAAs (Branched-Chain Amino Acids). Es unterstützt den Muskelaufbau und die Regeneration nach dem Training.
              </>
            ),
            source: 'Deutsche Gesellschaft für Ernährung',
            url: 'https://www.dge.de/',
          },
          {
            title: 'Kreatin – Mehr als nur Kraft',
            text: (
              <>
                <span style={{ backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>Kreatin-Monohydrat</span> ist eines der am besten erforschten Supplements im Fitnessbereich. Es erhöht die körperliche Leistung bei Schnellkrafttraining im Rahmen kurzzeitiger intensiver körperlicher Betätigung. Kreatin kommt natürlich in Fleisch und Fisch vor, die meisten Sportler supplementieren jedoch 3-5g täglich für optimale Ergebnisse.
              </>
            ),
            source: 'European Food Safety Authority (EFSA)',
            url: 'https://www.efsa.europa.eu/',
          },
          {
            title: 'Vitamin D – Das Sonnenvitamin',
            text: (
              <>
                <span style={{ backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>Vitamin D</span> spielt eine entscheidende Rolle für die Knochengesundheit, das Immunsystem und die Muskelfunktion. In Deutschland haben viele Menschen, besonders in den Wintermonaten, einen zu niedrigen Vitamin-D-Spiegel. Die Deutsche Gesellschaft für Ernährung empfiehlt bei unzureichender endogener Synthese eine tägliche Zufuhr von <span style={{ backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>20 µg (800 IE)</span>.
              </>
            ),
            source: 'Robert Koch-Institut',
            url: 'https://www.rki.de/',
          },
          {
            title: 'Omega-3-Fettsäuren',
            text: (
              <>
                <span style={{ backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>Omega-3-Fettsäuren</span> (EPA und DHA) sind essentielle Fettsäuren, die der Körper nicht selbst herstellen kann. Sie tragen zur normalen Herzfunktion bei und unterstützen die Gehirnfunktion. Gute Quellen sind fetter Fisch wie Lachs, Makrele und Hering, oder Fischöl-Kapseln als Supplement.
              </>
            ),
            source: 'Bundesinstitut für Risikobewertung',
            url: 'https://www.bfr.bund.de/',
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '40px', padding: '25px', backgroundColor: '#f9f9f9', borderLeft: '4px solid #FF8C00', borderRadius: '4px' }}>
            <h2 style={{ color: '#1a1a1a', marginBottom: '15px', fontSize: '1.6em', borderBottom: '2px solid #FF8C00', paddingBottom: '10px' }}>{section.title}</h2>
            <p style={{ marginBottom: '12px', textAlign: 'justify', fontSize: '1em' }}>{section.text}</p>
            <div style={{ fontSize: '0.85em', color: '#666', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
              Quelle: <a href={section.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>{section.source}</a>
            </div>
          </div>
        ))}
      </div>

      <footer style={{ backgroundColor: '#f0f0f0', color: '#666', textAlign: 'center', padding: '20px', marginTop: '40px', fontSize: '0.9em', borderTop: '1px solid #ddd' }}>
        <p>&copy; 2026 Wissenswertes über Supplements. Alle Rechte vorbehalten.</p>
        <p>Informationsseite über Nahrungsergänzungsmittel und Fitness.</p>
      </footer>
    </div>
  );
};

export default SafePage;
