import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('3D Canvas ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-0 flex items-center justify-center bg-[#F8FAFC] p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 text-center shadow-xl backdrop-blur-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">3D WebGL Studio Unavailable</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {this.state.error?.message || 'Unable to initialize the interactive 3D viewport on this device.'}
            </p>
            <button
              onClick={this.handleReset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reinitialize 3D Canvas
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
