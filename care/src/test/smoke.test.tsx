import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from '../App';
import { OfferingEditor } from '../components/OfferingEditor';
import { BatchEditor } from '../components/BatchEditor';
import { addMinutes } from '../lib/time';

beforeEach(() => {
  cleanup();
  window.location.hash = '#/';
});

async function go(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

describe('public pages', () => {
  it('landing shows the two entry points and the not-configured banner', async () => {
    await go('#/');
    expect(await screen.findByText('Yoga Class')).toBeTruthy();
    expect(screen.getByText('Physiotherapy')).toBeTruthy();
    expect(screen.getByText(/not connected to its database yet/i)).toBeTruthy();
  });
  it('yoga and physio pages explain the flow', async () => {
    await go('#/yoga');
    expect(await screen.findByText(/List your yoga classes/)).toBeTruthy();
    expect(screen.getByText(/Group classes in 1-hour batches/)).toBeTruthy();
    cleanup();
    await go('#/physio');
    expect(await screen.findByText(/List your physiotherapy practice/)).toBeTruthy();
    expect(screen.getByText(/Home visits in 45-minute slots/)).toBeTruthy();
  });
  it('admin login page renders', async () => {
    await go('#/admin');
    expect(await screen.findByText('Admin log in')).toBeTruthy();
  });
});

describe('registration form validation', () => {
  it('asks for every required field before anything is sent', async () => {
    await go('#/register/yoga');
    expect(await screen.findByText(/Register as a Yoga Teacher/)).toBeTruthy();
    const submit = screen.getByRole('button', { name: /Submit registration/ });
    fireEvent.click(submit);
    expect(await screen.findByText('Please enter your full name.')).toBeTruthy();

    const input = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;
    fireEvent.change(input(/Full name/), { target: { value: 'Asha Kulkarni' } });
    fireEvent.click(submit);
    expect(await screen.findByText(/valid 10-digit Indian mobile/)).toBeTruthy();
    fireEvent.change(input(/Mobile number/), { target: { value: '9812345678' } });
    fireEvent.change(input(/Email ID/), { target: { value: 'asha@example.com' } });
    fireEvent.click(submit);
    expect(await screen.findByText(/Password must be at least 8/)).toBeTruthy();
  });
  it('physio form uses physiotherapy wording', async () => {
    await go('#/register/physio');
    expect(await screen.findByText(/Register as a Physiotherapist/)).toBeTruthy();
    expect(screen.getByText(/Clinic address/)).toBeTruthy();
    expect(screen.getByText(/Upload physiotherapy certificate/)).toBeTruthy();
  });
});

describe('schedule publishing rules (client side)', () => {
  it('home visits must be whole 45-minute slots', async () => {
    render(<OfferingEditor kind="physio_home" title="Home" help="" fixedSlot={45} rates="session" onSaved={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Rate per session/), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: /Publish/ }));
    expect(await screen.findByText(/Fill in the start and end time/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Publish/ }));
    expect(await screen.findByText(/whole number of 45-minute slots/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '10:30' } });
    await waitFor(() => expect(screen.getByText('2 slots')).toBeTruthy());
  });
  it('yoga home visits need at least one rate', async () => {
    render(<OfferingEditor kind="yoga_home" title="Yoga home" help="" fixedSlot={60} rates="either" onSaved={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Publish/ }));
    expect(await screen.findByText(/rate per session, per month, or both/)).toBeTruthy();
  });
  it('yoga batch is exactly one hour and needs days and a monthly fee', async () => {
    render(<BatchEditor defaultLabel="Batch 1" onSaved={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Publish batch/ }));
    expect(await screen.findByText(/Select at least one day/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }));
    fireEvent.change(screen.getByLabelText(/Start time/), { target: { value: '06:00' } });
    expect((screen.getByLabelText(/Ends/) as HTMLInputElement).value).toBe('07:00');
    fireEvent.click(screen.getByRole('button', { name: /Publish batch/ }));
    expect(await screen.findByText(/monthly fee/)).toBeTruthy();
  });
  it('time helper never passes midnight', () => {
    expect(addMinutes('06:00', 60)).toBe('07:00');
    expect(addMinutes('23:30', 60)).toBe('');
  });
});
