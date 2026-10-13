import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div className="stack">
      <section className="hero">
        <p className="eyebrow">Breathing Point Care</p>
        <h1>Certified yoga teachers and physiotherapists, in one place</h1>
        <p className="lede">
          Register your classes or clinic, publish your timings and fees, and let patients and yoga seekers near you find and book you.
        </p>
      </section>

      <div className="grid2">
        <Link to="/yoga" className="card tile">
          <h2>Yoga Class</h2>
          <p>For certified yoga teachers: publish group batches and home-visit sessions.</p>
          <span className="btn btn-primary">Yoga teachers: start here</span>
        </Link>
        <Link to="/physio" className="card tile">
          <h2>Physiotherapy</h2>
          <p>For certified physiotherapists: publish clinic timings and home-visit slots.</p>
          <span className="btn btn-primary">Physiotherapists: start here</span>
        </Link>
      </div>

      <p className="muted center">Patient and yoga-seeker search and booking will open soon.</p>
    </div>
  );
}
