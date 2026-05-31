/**
 * SizingModeToggle — Unit tests
 * Requirements: PERF-02, PERF-03
 *
 * The mode controls are on/off switches (consistent with the Step 1
 * "Stretch cluster" switch): sizing OFF=vCPU / ON=Performance,
 * layout OFF=HCI / ON=Disaggregated.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClusterStore } from '@/store/useClusterStore';
import { useWizardStore } from '@/store/useWizardStore';
import { SizingModeToggle } from '../SizingModeToggle';

describe('SizingModeToggle', () => {
  beforeEach(() => {
    useWizardStore.setState({ sizingMode: 'vcpu', layoutMode: 'hci' });
    useClusterStore.setState({
      currentCluster: { ...useClusterStore.getState().currentCluster, isStretchCluster: false },
    });
  });

  it('renders only vCPU and Performance modes', () => {
    render(<SizingModeToggle />);
    expect(screen.getByText('vCPU')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.queryByText('Aggressive')).not.toBeInTheDocument();
    expect(screen.queryByText('GHz')).not.toBeInTheDocument();
    expect(screen.queryByText('SPECrate2017')).not.toBeInTheDocument();
  });

  it('sizing switch is unchecked when sizingMode is vcpu', () => {
    useWizardStore.setState({ sizingMode: 'vcpu' });
    render(<SizingModeToggle />);
    const sizingGroup = screen.getByRole('group', { name: /sizing mode/i });
    const sw = within(sizingGroup).getByRole('switch');
    expect(sw).not.toBeChecked();
  });

  it('sizing switch is checked when sizingMode is performance', () => {
    useWizardStore.setState({ sizingMode: 'performance' });
    render(<SizingModeToggle />);
    const sizingGroup = screen.getByRole('group', { name: /sizing mode/i });
    const sw = within(sizingGroup).getByRole('switch');
    expect(sw).toBeChecked();
  });

  it('toggling the sizing switch from vcpu calls setSizingMode with performance', () => {
    const setSizingMode = vi.fn();
    useWizardStore.setState({ sizingMode: 'vcpu', setSizingMode });
    render(<SizingModeToggle />);
    const sizingGroup = screen.getByRole('group', { name: /sizing mode/i });
    fireEvent.click(within(sizingGroup).getByRole('switch'));
    expect(setSizingMode).toHaveBeenCalledWith('performance');
  });

  it('toggling the sizing switch from performance calls setSizingMode with vcpu', () => {
    const setSizingMode = vi.fn();
    useWizardStore.setState({ sizingMode: 'performance', setSizingMode });
    render(<SizingModeToggle />);
    const sizingGroup = screen.getByRole('group', { name: /sizing mode/i });
    fireEvent.click(within(sizingGroup).getByRole('switch'));
    expect(setSizingMode).toHaveBeenCalledWith('vcpu');
  });

  it('layout switch toggles between hci and disaggregated', () => {
    const setLayoutMode = vi.fn();
    useWizardStore.setState({ layoutMode: 'hci', setLayoutMode });
    render(<SizingModeToggle />);
    const layoutGroup = screen.getByRole('group', { name: /layout mode/i });
    expect(within(layoutGroup).getByRole('switch')).not.toBeChecked();
    fireEvent.click(within(layoutGroup).getByRole('switch'));
    expect(setLayoutMode).toHaveBeenCalledWith('disaggregated');
  });

  it('stretch switch reflects and toggles currentCluster.isStretchCluster', () => {
    const setCurrentCluster = vi.fn();
    useClusterStore.setState({
      currentCluster: { ...useClusterStore.getState().currentCluster, isStretchCluster: false },
      setCurrentCluster,
    });
    render(<SizingModeToggle />);
    const stretchGroup = screen.getByRole('group', { name: /stretch cluster/i });
    const sw = within(stretchGroup).getByRole('switch');
    expect(sw).not.toBeChecked();
    fireEvent.click(sw);
    expect(setCurrentCluster).toHaveBeenCalledWith(
      expect.objectContaining({ isStretchCluster: true }),
    );
  });

  describe('Phase 28: Mobile foundation', () => {
    it('NAV-03: sizing mode group has flex-wrap class', () => {
      render(<SizingModeToggle />);
      const group = screen.getByRole('group', { name: /sizing mode/i });
      expect(group.className).toMatch(/flex-wrap/);
    });

    it('NAV-03: layout mode group has flex-wrap class', () => {
      render(<SizingModeToggle />);
      const group = screen.getByRole('group', { name: /layout mode/i });
      expect(group.className).toMatch(/flex-wrap/);
    });
  });
});
