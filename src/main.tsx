import {createRoot} from 'react-dom/client';
import {CreditSimulator} from './components/credit-simulator/credit-simulator';
import AccessBoundary from './components/access-boundary';
import './titayla.css';
createRoot(document.getElementById('root')!).render(<AccessBoundary><main><div className="wrap credit-page"><header className="credit-intro">
<a href="/auth/titayla/catalogue/" className="back-link">← Toutes nos applications</a>
<p className="eyebrow">Titayla · Financement</p><h1>Simulateur de crédit</h1>
<p className="lead">Votre projet immobilier, en chiffres clairs. Explorez votre financement et repartez avec votre tableau d’amortissement.</p>
</header><CreditSimulator /></div></main></AccessBoundary>);
