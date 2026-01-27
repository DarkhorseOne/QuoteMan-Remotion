'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Loader2,
  FileAudio,
  Video,
  Cloud,
  Calendar,
  X,
  Send,
  RotateCcw,
  Languages,
} from 'lucide-react';
import { QuoteTable } from '@/components/QuoteTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const [tag, setTag] = useState('all');
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [frequency, setFrequency] = useState('daily');

  const params = new URLSearchParams({
    page: page.toString(),
    limit: '50',
    search,
  });

  if (tag && tag !== 'all') params.append('tag', tag);
  if (status && status !== 'all') params.append('status', status);
  if (platform && platform !== 'all') params.append('platform', platform);

  const { data: quotesData, mutate } = useSWR(`/api/quotes?${params.toString()}`, fetcher);
  const { data: tagsData } = useSWR('/api/tags', fetcher);

  const quotes = quotesData?.data || [];
  const meta = quotesData?.meta || { total: 0, totalPages: 1 };

  const handleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selected.length === quotes.length) {
      setSelected([]);
    } else {
      setSelected(quotes.map((q: any) => q.id));
    }
  };

  const runAction = async (action: string) => {
    if (selected.length === 0 && action !== 'postprocess' && action !== 'sync') return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/actions/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteIds: selected }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      mutate();
      toast.success(`Action ${action} completed successfully.\n${result.stdout || ''}`);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSchedule = async () => {
    if (selected.length === 0 || !startDate) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/actions/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteIds: selected, startDate, frequency }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      mutate();
      toast.success('Scheduled successfully');
      setShowSchedule(false);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">QuoteMan Manager</h1>
          <p className="text-gray-500 mt-1">Manage, Generate, and Publish Quotes</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <span className="block text-xs text-gray-500 uppercase font-semibold">
              Total Quotes
            </span>
            <span className="text-2xl font-bold text-indigo-600">
              {meta.total.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center bg-gray-50/50">
          <div className="flex items-center gap-2 w-64">
            <Input
              placeholder="Search text or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>

          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tagsData?.map((t: any) => (
                <SelectItem key={t.tag} value={t.tag}>
                  {t.tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="audio_ready">Audio Ready</SelectItem>
              <SelectItem value="rendered">Rendered</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="scheduled">Scheduled (Pub)</SelectItem>
              <SelectItem value="posted">Posted (Pub)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="google_drive">Google Drive</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="wechat_channels">WeChat</SelectItem>
              <SelectItem value="xiaohongshu">XiaoHongShu</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button
              onClick={() => runAction('tts')}
              disabled={selected.length === 0 || processing}
              variant="default"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {processing ? (
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <FileAudio className="w-3 h-3 mr-2" />
              )}
              TTS
            </Button>
            <Button
              onClick={() => runAction('translate')}
              disabled={selected.length === 0 || processing}
              variant="default"
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
            >
              {processing && selected.length > 0 ? (
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <Languages className="w-3 h-3 mr-2" />
              )}
              Translate
            </Button>
            <Button
              onClick={() => runAction('postprocess')}
              disabled={processing}
              variant="secondary"
              size="sm"
            >
              Post-Process
            </Button>
            <Button
              onClick={() => runAction('render')}
              disabled={selected.length === 0 || processing}
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? (
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <Video className="w-3 h-3 mr-2" />
              )}
              Render
            </Button>
            <Button
              onClick={() => runAction('publish')}
              disabled={
                selected.length === 0 ||
                processing ||
                quotes.filter((q: any) => selected.includes(q.id) && q.status !== 'rendered')
                  .length > 0
              }
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              title={
                quotes.filter((q: any) => selected.includes(q.id) && q.status !== 'rendered')
                  .length > 0
                  ? 'Only rendered quotes can be published'
                  : 'Set status to Published'
              }
            >
              <Send className="w-3 h-3 mr-2" />
              Publish
            </Button>
            <Button
              onClick={() => runAction('unpublish')}
              disabled={
                selected.length === 0 ||
                processing ||
                quotes.filter((q: any) => selected.includes(q.id) && q.status !== 'published')
                  .length > 0
              }
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-900 border-gray-300"
              title="Revert Published to Rendered"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Unpublish
            </Button>
            <Button
              onClick={() => setShowSchedule(true)}
              disabled={selected.length === 0 || processing}
              variant="default"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Calendar className="w-3 h-3 mr-2" />
              Schedule
            </Button>
            <Button
              onClick={() => runAction('sync')}
              disabled={processing}
              variant="default"
              size="sm"
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Cloud className="w-3 h-3 mr-2" />
              Sync Drive
            </Button>
          </div>
        </div>

        {showSchedule && (
          <div className="absolute inset-0 bg-white/95 z-10 flex items-center justify-center p-4">
            <div className="bg-white shadow-xl border border-gray-200 rounded-lg p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Schedule {selected.length} Quotes</h3>
                <button onClick={() => setShowSchedule(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border rounded-md"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleSchedule}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-md font-medium hover:bg-purple-700"
                  >
                    Confirm Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="min-h-[500px]">
          <QuoteTable
            quotes={quotes}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onRefresh={() => mutate()}
          />
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50/50">
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              disabled={page === meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
