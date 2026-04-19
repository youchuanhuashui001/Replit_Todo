import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useGetMe,
  useLogin,
  useRegister,
  useLogout,
  useGetBootstrap,
  useCreateMemo,
  useUpdateMemo,
  useDeleteMemo,
  useAckReminder,
  useSearchCities,
  useAddCity,
  useSetDefaultCity,
  useDeleteCity,
  getGetBootstrapQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  LogOut,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Cloud,
  CloudRain,
  Wind,
  Search,
  Pencil,
  Plus,
  X,
  Image as ImageIcon,
} from "lucide-react";

export default function Home() {
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false } });
  if (isUserLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">加载中…</div>;
  }
  if (!user) return <AuthScreen />;
  return <DashboardScreen user={user.user} />;
}

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMut = useLogin({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "登录成功" }); },
      onError: (err) => { toast({ title: "登录失败", description: (err as any).data?.error ?? "请稍后重试", variant: "destructive" }); },
    },
  });
  const registerMut = useRegister({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "注册成功" }); },
      onError: (err) => { toast({ title: "注册失败", description: (err as any).data?.error ?? "请稍后重试", variant: "destructive" }); },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">个人仪表盘</h1>
          <p className="text-lg text-slate-600">一个简洁、可靠的中文个人数字助理，整合备忘录、天气和节假日信息。</p>
        </div>
        <Card className="w-full shadow-lg border-0">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none h-14">
              <TabsTrigger value="login" className="text-base">登录</TabsTrigger>
              <TabsTrigger value="register" className="text-base">注册</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="p-6 m-0">
              <form onSubmit={(e) => { e.preventDefault(); loginMut.mutate({ data: { email, password } }); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">邮箱</Label>
                  <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loginMut.isPending}>
                  {loginMut.isPending ? "登录中…" : "登录"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register" className="p-6 m-0">
              <form onSubmit={(e) => { e.preventDefault(); registerMut.mutate({ data: { email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-email">邮箱</Label>
                  <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">密码</Label>
                  <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={registerMut.isPending}>
                  {registerMut.isPending ? "注册中…" : "注册并登录"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function DashboardScreen({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logoutMut = useLogout({
    mutation: { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "已退出登录" }); } },
  });
  const { data: bootstrap, isLoading } = useGetBootstrap();

  if (isLoading || !bootstrap) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        加载仪表盘…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b sticky top-0 z-10 px-6 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-base">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
            {user.email.charAt(0).toUpperCase()}
          </span>
          个人仪表盘
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="hidden sm:block">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={() => logoutMut.mutate()} className="text-slate-500 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-1.5" /> 退出
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <ClockPanel weather={bootstrap.weather} />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <ReminderPanel memos={bootstrap.memos} />
            <CityManagerPanel cities={bootstrap.cities} />
          </div>
          <div className="col-span-12 lg:col-span-9 h-[560px]">
            <MemoPanel memos={bootstrap.memos} />
          </div>
        </div>

        <CalendarHolidayPanel holidays={bootstrap.holidays} />
      </main>
    </div>
  );
}

function ClockPanel({ weather }: { weather: any }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = time.toLocaleDateString("zh-CN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-blue-600 text-white">
      <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-5xl font-bold tracking-tighter font-mono tabular-nums mb-1">{timeStr}</div>
          <div className="text-blue-100 text-base">{dateStr}</div>
        </div>
        {weather ? (
          <div className="bg-white/15 rounded-xl px-5 py-3 flex items-center gap-5 border border-white/20 shrink-0">
            <div className="text-center">
              <div className="text-3xl font-light tabular-nums">{weather.temperature}°C</div>
              <div className="text-blue-100 text-xs mt-0.5">{weather.weatherLabel}</div>
            </div>
            <div className="w-px h-10 bg-white/25" />
            <div className="space-y-1 text-sm text-blue-100">
              <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{weather.cityName}</div>
              <div className="flex items-center gap-1.5"><CloudRain className="w-3.5 h-3.5" />湿度 {weather.humidity}%</div>
              <div className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5" />风速 {weather.windSpeed} km/h</div>
            </div>
          </div>
        ) : (
          <div className="text-blue-200 text-sm">新的一天，保持专注</div>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderPanel({ memos }: { memos: any[] }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  const queryClient = useQueryClient();
  const ackMut = useAckReminder({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }) },
  });

  const active = memos.filter((m) => m.remindAt && !m.reminderAcknowledgedAt && new Date(m.remindAt) <= now);

  return (
    <Card className="border-0 shadow-sm flex flex-col flex-1 min-h-0">
      <CardHeader className="pb-2 border-b border-slate-100 py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
          <Clock className="w-4 h-4 text-primary" />
          到点提醒
          {active.length > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">{active.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          {active.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">暂无到期提醒</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {active.map((m) => (
                <div key={m.id} className="p-3 bg-orange-50/60">
                  <p className="font-medium text-sm text-slate-800 mb-1">{m.title}</p>
                  <p className="text-xs text-slate-500 mb-2">{new Date(m.remindAt).toLocaleString("zh-CN")}</p>
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs border-orange-200 text-orange-700 hover:bg-orange-100"
                    onClick={() => ackMut.mutate({ id: m.id })} disabled={ackMut.isPending}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 我知道了
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CityManagerPanel({ cities }: { cities: any[] }) {
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchMut = useSearchCities();
  const addCityMut = useAddCity({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }); setQuery(""); searchMut.reset(); toast({ title: "城市已添加" }); },
    },
  });
  const deleteCityMut = useDeleteCity({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }) } });
  const setDefaultMut = useSetDefaultCity({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }) } });

  return (
    <Card className="border-0 shadow-sm flex flex-col flex-1 min-h-0">
      <CardHeader className="pb-2 border-b border-slate-100 py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
          <Cloud className="w-4 h-4 text-primary" /> 城市管理
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3 flex-1 flex flex-col min-h-0">
        <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) searchMut.mutate({ data: { query } }); }} className="flex gap-1.5 flex-shrink-0">
          <Input placeholder="搜索城市…" value={query} onChange={(e) => setQuery(e.target.value)} className="bg-slate-50 border-0 h-8 text-sm" />
          <Button type="submit" variant="secondary" size="sm" className="h-8 px-2.5 flex-shrink-0" disabled={searchMut.isPending}>
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>
        {searchMut.data?.results && searchMut.data.results.length > 0 && (
          <div className="bg-white border rounded-md overflow-hidden shadow-sm divide-y text-xs flex-shrink-0">
            {searchMut.data.results.map((r: any, i: number) => (
              <div key={i} className="px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-slate-700">{r.name} <span className="text-slate-400">{r.admin1}</span></span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-primary" onClick={() => addCityMut.mutate({ data: { ...r } })}>添加</Button>
              </div>
            ))}
          </div>
        )}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-1 pr-3">
            {cities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">暂无城市</p>
            ) : (
              cities.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50 group">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    {c.name}
                    {c.isDefault && <span className="bg-primary/10 text-primary text-[10px] px-1 py-px rounded leading-none">默认</span>}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                    {!c.isDefault && (
                      <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={() => setDefaultMut.mutate({ id: c.id })}>设默认</Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-400" onClick={() => deleteCityMut.mutate({ id: c.id })}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

type MemoFormData = { title: string; content: string; remindAt: string; imageDataUrl: string };

function MemoPanel({ memos }: { memos: any[] }) {
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [addOpen, setAddOpen] = useState(false);
  const [editMemo, setEditMemo] = useState<any | null>(null);
  const [viewMemo, setViewMemo] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [form, setForm] = useState<MemoFormData>({ title: "", content: "", remindAt: "", imageDataUrl: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });

  const createMut = useCreateMemo({
    mutation: {
      onSuccess: () => { invalidate(); setAddOpen(false); resetForm(); toast({ title: "备忘录已保存" }); },
    },
  });
  const updateMut = useUpdateMemo({
    mutation: {
      onSuccess: () => { invalidate(); setEditMemo(null); resetForm(); toast({ title: "备忘录已更新" }); },
    },
  });
  const deleteMut = useDeleteMemo({
    mutation: {
      onSuccess: () => { invalidate(); setViewMemo(null); setEditMemo(null); toast({ title: "已删除" }); },
    },
  });

  const resetForm = () => setForm({ title: "", content: "", remindAt: "", imageDataUrl: "" });

  const openAdd = () => { resetForm(); setAddOpen(true); };
  const openEdit = (m: any) => {
    setForm({
      title: m.title,
      content: m.content || "",
      remindAt: m.remindAt ? m.remindAt.slice(0, 16) : "",
      imageDataUrl: m.imageDataUrl || "",
    });
    setViewMemo(null);
    setEditMemo(m);
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
    const memo = memos.find((m) => m.id === id);
    if (memo) {
      updateMut.mutate({
        id,
        data: {
          title: memo.title,
          content: memo.content || null,
          remindAt: memo.remindAt ? memo.remindAt.slice(0, 16) : null,
          imageDataUrl: memo.imageDataUrl || null,
          completedAt: completed ? new Date().toISOString() : null,
        },
      });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm((f) => ({ ...f, imageDataUrl: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      content: form.content || null,
      remindAt: form.remindAt ? new Date(form.remindAt).toISOString() : null,
      imageDataUrl: form.imageDataUrl || null,
    };
    if (editMemo) {
      updateMut.mutate({ id: editMemo.id, data: payload });
    } else {
      createMut.mutate({ data: payload });
    }
  };

  const MemoFormDialog = (
    <Dialog open={addOpen || !!editMemo} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditMemo(null); resetForm(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editMemo ? "编辑备忘录" : "添加备忘录"}</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">内容支持 Markdown 语法</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="memo-title" className="text-sm">标题</Label>
            <Input id="memo-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="备忘录标题…" required className="bg-slate-50 border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memo-content" className="text-sm">内容 <span className="text-slate-400 font-normal text-xs">（支持 Markdown）</span></Label>
            <Textarea id="memo-content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="支持 **加粗**、*斜体*、`代码`、- 列表…" className="min-h-[120px] font-mono text-sm bg-slate-50 border-slate-200 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">提醒时间</Label>
              <Input type="datetime-local" value={form.remindAt} onChange={(e) => setForm((f) => ({ ...f, remindAt: e.target.value }))} className="bg-slate-50 border-slate-200 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">图片附件</Label>
              <Input type="file" accept="image/*" onChange={handleFile} className="bg-slate-50 border-slate-200 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary/10 file:text-primary" />
            </div>
          </div>
          {form.imageDataUrl && (
            <div className="relative rounded-md overflow-hidden h-28 bg-slate-100">
              <img src={form.imageDataUrl} alt="预览" className="object-contain w-full h-full" />
              <button type="button" onClick={() => setForm((f) => ({ ...f, imageDataUrl: "" }))} className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditMemo(null); resetForm(); }}>取消</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const MemoViewDialog = (
    <Dialog open={!!viewMemo} onOpenChange={(open) => { if (!open) setViewMemo(null); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8 text-lg">{viewMemo?.title}</DialogTitle>
          <DialogDescription className="sr-only">备忘录详情</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-1">
          <div className="space-y-4 py-1">
            {viewMemo?.content ? (
              <div className="prose prose-sm prose-slate max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewMemo.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">无内容</p>
            )}
            {viewMemo?.remindAt && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded px-3 py-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                提醒：{new Date(viewMemo.remindAt).toLocaleString("zh-CN")}
                {viewMemo.reminderAcknowledgedAt && <span className="ml-auto text-slate-400">已确认</span>}
              </div>
            )}
            {viewMemo?.imageDataUrl && (
              <img src={viewMemo.imageDataUrl} alt="附图" className="rounded-lg w-full max-h-52 object-contain bg-slate-100" />
            )}
            <p className="text-[11px] text-slate-400">
              更新于 {viewMemo && new Date(viewMemo.updatedAt).toLocaleString("zh-CN")}
            </p>
          </div>
        </ScrollArea>
        <DialogFooter className="flex-row justify-between pt-2 border-t border-slate-100 mt-2">
          <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={deleteMut.isPending}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> 删除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMemo(null)}>关闭</Button>
            <Button size="sm" onClick={() => viewMemo && openEdit(viewMemo)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> 编辑
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const DeleteConfirmDialog = (
    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            {viewMemo?.completedAt ? (
              <div className="space-y-2 mt-2">
                <p className="text-red-600 font-medium">⚠️ 这是一个已完成的任务</p>
                <p>删除后将无法恢复。确定要删除吗？</p>
              </div>
            ) : (
              <p>确定要删除这条备忘录吗？</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
          <Button variant="destructive" onClick={() => {
            if (viewMemo) {
              deleteMut.mutate({ id: viewMemo.id });
              setDeleteConfirmOpen(false);
            }
          }} disabled={deleteMut.isPending}>
            {deleteMut.isPending ? "删除中…" : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Card className="border-0 shadow-sm h-full flex flex-col">
        <CardHeader className="border-b border-slate-100 py-3 px-4 flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-base font-semibold text-slate-700">备忘录</CardTitle>
          <Button size="sm" onClick={openAdd} className="h-8 gap-1.5">
            <Plus className="w-4 h-4" /> 添加备忘录
          </Button>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "completed")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-4 py-3 w-full border-b border-slate-100 rounded-none bg-transparent">
            <TabsTrigger value="pending" className="text-sm">
              未完成
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                {memos.filter((m) => !m.completedAt).length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-sm">
              已完成
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                {memos.filter((m) => m.completedAt).length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="flex-1 min-h-0 p-0 m-0">
            <CardContent className="p-0 flex-1 h-full">
              <ScrollArea className="h-full">
                {memos.filter((m) => !m.completedAt).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 gap-3">
                    <p className="text-sm">暂无未完成的备忘录</p>
                    <Button size="sm" variant="outline" onClick={openAdd} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> 创建第一条
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:p-4 sm:gap-3">
                    {memos.filter((m) => !m.completedAt).map((m) => (
                      <MemoCard key={m.id} memo={m} onClick={() => setViewMemo(m)} onToggleComplete={handleToggleComplete} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </TabsContent>
          <TabsContent value="completed" className="flex-1 min-h-0 p-0 m-0">
            <CardContent className="p-0 flex-1 h-full">
              <ScrollArea className="h-full">
                {memos.filter((m) => m.completedAt).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 gap-3">
                    <p className="text-sm">暂无已完成的备忘录</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:p-4 sm:gap-3">
                    {memos.filter((m) => m.completedAt).map((m) => (
                      <MemoCard key={m.id} memo={m} onClick={() => setViewMemo(m)} onToggleComplete={handleToggleComplete} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </TabsContent>
        </Tabs>

        {MemoFormDialog}
        {MemoViewDialog}
        {DeleteConfirmDialog}
      </Card>
    </>
  );
}

function MemoCard({ memo, onClick, onToggleComplete }: { memo: any; onClick: () => void; onToggleComplete: (id: string, completed: boolean) => void }) {
  const isCompleted = !!memo.completedAt;
  return (
    <div
      className={`group relative cursor-pointer rounded-xl border bg-white transition-all p-4 flex flex-col ${
        isCompleted
          ? "border-slate-200 bg-slate-50 opacity-60"
          : "border-slate-100 hover:border-primary/30 hover:shadow-sm"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`font-semibold text-sm leading-snug flex-1 ${isCompleted ? "line-through text-slate-400" : "text-slate-900"}`}>
          {memo.title}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(memo.id, !isCompleted);
          }}
          className="flex-shrink-0 text-slate-400 hover:text-primary transition-colors"
          title={isCompleted ? "标记为未完成" : "标记为已完成"}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <div className="w-5 h-5 border-2 border-slate-300 rounded-full hover:border-primary" />
          )}
        </button>
      </div>
      {memo.content && !isCompleted && (
        <div className="prose prose-xs prose-slate max-w-none line-clamp-3 mb-3 text-xs leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{memo.content}</ReactMarkdown>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto mb-2">
        {memo.remindAt && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" />{new Date(memo.remindAt).toLocaleDateString("zh-CN")}
          </span>
        )}
        {memo.imageDataUrl && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            <ImageIcon className="w-2.5 h-2.5" />图片
          </span>
        )}
      </div>
      <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
        点击查看详情
      </div>
    </div>
  );
}

function CalendarHolidayPanel({ holidays }: { holidays: any[] }) {
  const [month, setMonth] = useState(new Date());
  const holidayDates = holidays.map((h: any) => new Date(h.date + "T00:00:00"));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 border-b border-slate-100 py-3 px-4">
        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" /> 日历与节假日
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-4 flex justify-center">
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              modifiers={{ holiday: holidayDates }}
              modifiersClassNames={{ holiday: "bg-red-100 text-red-700 font-semibold rounded-full" }}
              className="w-full max-w-xs"
            />
          </div>
          <div>
            <ScrollArea className="h-[320px]">
              <div className="p-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">未来 90 天节假日</p>
                {holidays.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">近期没有节假日</p>
                ) : (
                  <div className="space-y-1">
                    {holidays.map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-slate-50 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{h.localName || h.name}</p>
                          {h.localName && h.name !== h.localName && (
                            <p className="text-xs text-slate-400 truncate">{h.name}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded tabular-nums">
                          {h.date}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
