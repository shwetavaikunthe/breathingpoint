import { Link } from 'react-router-dom';
import { typeFromSlug, TYPE_LABEL } from '../lib/types';

export function TypeLanding({ slug }: { slug: 'yoga' | 'physio' }) {
  const type = typeFromSlug(slug)!;
  const yoga = type === 'yoga_teacher';

  return (
    <div className="stack narrow-page">
      <section className="hero">
        <p className="eyebrow">{yoga ? 'Yoga Class' : 'Physiotherapy'}</p>
        <h1>{yoga ? 'List your yoga classes' : 'List your physiotherapy practice'}</h1>
        <p className="lede">
          {yoga
            ? 'For certified yoga teachers (for example Ishwari Yoga Institute graduates) who teach group batches or one-to-one classes at home.'
            : 'For certified physiotherapists who see patients at a clinic, at home, or both.'}
        </p>
      </section>

      <section className="card">
        <h2>How it works</h2>
        <ol className="steps">
          <li><strong>Register</strong> with your contact details, class or clinic location, and your certificate.</li>
          <li><strong>We review</strong> your certificate. If something needs fixing we tell you exactly what, and you can resubmit.</li>
          <li>
            <strong>Publish your timings</strong> once approved:
            {yoga ? (
              <ul>
                <li>Group classes in 1-hour batches (you can add several) with a monthly fee</li>
                <li>Home visits in 1-hour slots, with a fee per session and/or per month</li>
              </ul>
            ) : (
              <ul>
                <li>Clinic visit timings with your fee per session</li>
                <li>Home visits in 45-minute slots, with your fee per session</li>
              </ul>
            )}
          </li>
        </ol>
        <div className="actions">
          <Link className="btn btn-primary" to={`/register/${slug}`}>Register as a {TYPE_LABEL[type]}</Link>
          <Link className="btn btn-ghost" to="/login">Already registered? Log in</Link>
        </div>
      </section>
    </div>
  );
}
