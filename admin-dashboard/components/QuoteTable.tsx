'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Video as VideoIcon,
  FileAudio,
  Calendar,
  Youtube,
  MessageCircle, // For WeChat
  Instagram, // For XiaoHongShu (closest icon)
  Copy,
  Languages,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

// Helper for icons
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'youtube':
      return <Youtube className="w-4 h-4 text-red-600" />;
    case 'wechat_channels':
      return <MessageCircle className="w-4 h-4 text-green-600" />;
    case 'xiaohongshu':
      return <Instagram className="w-4 h-4 text-pink-600" />; // Fallback icon
    case 'google_drive':
      return (
        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">
          D
        </div>
      );
    default:
      return <div className="w-4 h-4 bg-gray-200 rounded-full" />;
  }
};

const PLATFORMS = [
  {
    id: 'wechat_channels',
    label: 'WeChat Channels',
    icon: <MessageCircle className="w-4 h-4 text-green-600" />,
  },
  {
    id: 'xiaohongshu',
    label: 'XiaoHongShu',
    icon: <Instagram className="w-4 h-4 text-pink-600" />,
  },
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4 text-red-600" /> },
  {
    id: 'google_drive',
    label: 'Google Drive',
    icon: (
      <div className="w-4 h-4 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center">
        D
      </div>
    ),
  },
];

interface QuoteTableProps {
  quotes: any[];
  selected: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
}

export function QuoteTable({
  quotes,
  selected,
  onSelect,
  onSelectAll,
  onRefresh,
}: QuoteTableProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [publishingOpen, setPublishingOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<any>(null);

  const openDetail = (quote: any) => {
    setCurrentQuote(quote);
    setDetailOpen(true);
  };

  const openPublishing = (quote: any) => {
    setCurrentQuote(quote);
    setPublishingOpen(true);
  };

  return (
    <>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={quotes.length > 0 && selected.length === quotes.length}
                  onChange={onSelectAll}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Text</TableHead>
              <TableHead className="w-[120px]">Tag</TableHead>
              <TableHead className="w-[80px]">Gender</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[180px]">Publishing</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow
                key={quote.id}
                data-state={selected.includes(quote.id) ? 'selected' : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.includes(quote.id)}
                    onChange={() => onSelect(quote.id)}
                    className="rounded border-gray-300"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-gray-500">
                  <span
                    className="cursor-pointer hover:bg-gray-100 px-1 rounded transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(quote.id);
                      toast.success('ID copied to clipboard');
                    }}
                    title="Click to copy ID"
                  >
                    {quote.id.substring(0, 8)}
                  </span>
                  {quote.text_zh && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-[9px] px-1 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200"
                    >
                      CN
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span
                      className="line-clamp-2 font-medium cursor-pointer hover:underline"
                      onClick={() => openDetail(quote)}
                    >
                      {quote.text}
                    </span>
                    {quote.author && (
                      <span className="text-xs text-gray-500">— {quote.author}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {quote.tag}
                  </Badge>
                </TableCell>
                <TableCell>
                  {quote.voice_gender && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      {quote.voice_gender === 'male' ? 'Male' : 'Female'}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={quote.status} />
                </TableCell>
                <TableCell>
                  <PublishingGrid quote={quote} />
                </TableCell>
                <TableCell className="text-right">
                  <ActionMenu
                    quote={quote}
                    onRefresh={onRefresh}
                    openDetail={() => openDetail(quote)}
                    openPublishing={() => openPublishing(quote)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {quotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <QuoteDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        quote={currentQuote}
        onRefresh={onRefresh}
      />
      <PublishingDialog
        open={publishingOpen}
        onOpenChange={setPublishingOpen}
        quote={currentQuote}
        onRefresh={onRefresh}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'border-gray-200 text-gray-500 bg-gray-50',
    audio_ready: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    rendered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    published: 'bg-blue-100 text-blue-700 border-blue-200',
    scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
    posted: 'bg-green-100 text-green-700 border-green-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] px-1.5 py-0 h-5 border font-medium', variants[status])}
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}

function PublishingGrid({ quote }: { quote: any }) {
  // quote.publishing is array of { platform, posted_status, scheduled_time }
  if (!quote.publishing || quote.publishing.length === 0)
    return <span className="text-xs text-gray-300">-</span>;

  const getStatusColor = (status: string) => {
    if (status === 'posted') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'scheduled') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-500 border-gray-200';
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {quote.publishing.map((pub: any) => (
        <div
          key={pub.id}
          className={cn(
            'flex items-center p-1 rounded border text-[10px]',
            getStatusColor(pub.posted_status),
          )}
        >
          <PlatformIcon platform={pub.platform} />
        </div>
      ))}
    </div>
  );
}

function ActionMenu({
  quote,
  onRefresh,
  openDetail,
  openPublishing,
}: {
  quote: any;
  onRefresh: () => void;
  openDetail: () => void;
  openPublishing: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={openDetail}>
          <Eye className="mr-2 h-4 w-4" /> View Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openPublishing}>
          <Calendar className="mr-2 h-4 w-4" /> Manage Publishing
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PublishingDialog({
  open,
  onOpenChange,
  quote,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: any;
  onRefresh: () => void;
}) {
  if (!quote) return null;

  // Helper to find existing config for a platform
  const getPubConfig = (platformId: string) => {
    return quote.publishing?.find((p: any) => p.platform === platformId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Publishing Manager</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="text-sm text-gray-500 border-b pb-4">
            Manage publishing schedules for{' '}
            <span className="font-medium text-gray-900">{quote.text.substring(0, 50)}...</span>
          </div>

          <div className="space-y-4">
            {PLATFORMS.map((platform) => (
              <PlatformRow
                key={platform.id}
                platform={platform}
                initialConfig={getPubConfig(platform.id)}
                quoteId={quote.id}
                onUpdate={onRefresh}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlatformRow({
  platform,
  initialConfig,
  quoteId,
  onUpdate,
}: {
  platform: any;
  initialConfig: any;
  quoteId: string;
  onUpdate: () => void;
}) {
  const [date, setDate] = useState(
    initialConfig?.scheduled_time
      ? new Date(initialConfig.scheduled_time).toISOString().slice(0, 16)
      : '',
  );
  const [status, setStatus] = useState(initialConfig?.posted_status || 'scheduled');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/actions/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteIds: [quoteId],
          platform: platform.id,
          startDate: date,
          status: status,
          frequency: 'once', // Explicitly once for single item update
        }),
      });
      if (!res.ok) throw new Error('Failed');
      onUpdate();
      toast.success(`Saved ${platform.label}`);
    } catch {
      toast.error('Error saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
      <div className="flex items-center gap-3 w-[200px]">
        <div className="p-2 bg-white rounded border shadow-sm">{platform.icon}</div>
        <div>
          <div className="font-medium text-sm">{platform.label}</div>
          <div className="text-xs text-gray-500">
            {initialConfig ? (
              <span
                className={cn(
                  initialConfig.posted_status === 'posted'
                    ? 'text-green-600'
                    : initialConfig.posted_status === 'scheduled'
                      ? 'text-blue-600'
                      : 'text-gray-500',
                )}
              >
                {initialConfig.posted_status}
              </span>
            ) : (
              'Not configured'
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <div className="grid gap-1.5">
          <Label className="text-xs">Schedule Time</Label>
          <Input
            type="datetime-local"
            className="h-8 w-[200px]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end h-full pb-0.5">
          <Button size="sm" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuoteDetailDialog({
  open,
  onOpenChange,
  quote,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  onRefresh: () => void;
}) {
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  if (!quote) return null;

  const currentStatus = localStatus || quote.status;
  const isPublished = currentStatus === 'published';

  const handleStatusChange = async (checked: boolean) => {
    const newStatus = checked ? 'published' : 'rendered';
    setLocalStatus(newStatus); // Optimistic update

    try {
      const res = await fetch(`/api/quotes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quote.id,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        setLocalStatus(null); // Revert on failure
        const result = await res.json();
        throw new Error(result.error || 'Failed to update status');
      }

      toast.success(`Status updated to ${newStatus}`);
      onRefresh();
    } catch (e: any) {
      setLocalStatus(null); // Revert on failure
      toast.error(e.message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setLocalStatus(null); // Reset local state when closing
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quote Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Quote Text</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published-mode"
                    checked={isPublished}
                    onCheckedChange={handleStatusChange}
                  />
                  <Label htmlFor="published-mode" className="text-xs font-normal">
                    {isPublished ? 'Published' : 'Mark as Published'}
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(quote.text);
                    toast.success('Quote text copied to clipboard');
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-lg font-medium leading-relaxed">
              {quote.text}
            </div>

            {quote.text_zh && (
              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">
                    Chinese Translation
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        const fullText = `${quote.text}\n${quote.text_zh}`;
                        navigator.clipboard.writeText(fullText);
                        toast.success('English and Chinese copied to clipboard');
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(quote.text_zh);
                        toast.success('Chinese text copied to clipboard');
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy CN
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-md text-lg font-medium leading-relaxed text-gray-800">
                  {quote.text_zh}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Author</Label>
              <div className="font-medium">{quote.author || '-'}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Tag</Label>
              <div>
                <Badge variant="outline">{quote.tag}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Voice Gender</Label>
              <div className="font-medium capitalize">{quote.voice_gender || '-'}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Status</Label>
              <div>
                <StatusBadge status={currentStatus} />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase tracking-wider">Assets</Label>
            <div className="grid gap-2">
              <div className="flex flex-col gap-1 p-2 border rounded text-sm">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-indigo-500" />
                  <span className="text-gray-600 font-medium">Audio:</span>
                </div>
                <div className="font-mono text-xs break-all pl-6 text-gray-500">
                  {quote.audio_path || 'Not generated'}
                </div>
              </div>
              <div className="flex flex-col gap-1 p-2 border rounded text-sm">
                <div className="flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600 font-medium">Video:</span>
                </div>
                <div className="font-mono text-xs break-all pl-6 text-gray-500">
                  {quote.video_path || 'Not generated'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase tracking-wider">
              Publishing Info
            </Label>
            {quote.publishing && quote.publishing.length > 0 ? (
              <div className="grid gap-2">
                {quote.publishing.map((pub: any) => (
                  <div
                    key={pub.id}
                    className="flex items-center justify-between p-2 border rounded bg-gray-50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={pub.platform} />
                      <span className="capitalize font-medium">
                        {pub.platform.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs border',
                          pub.posted_status === 'posted'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100',
                        )}
                      >
                        {pub.posted_status}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {pub.scheduled_time ? format(new Date(pub.scheduled_time), 'PP p') : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">No publishing records</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
