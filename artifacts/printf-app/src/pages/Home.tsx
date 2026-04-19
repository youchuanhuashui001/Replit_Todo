import React, { useState, useEffect } from "react";
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
  getGetBootstrapQueryKey
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { LogOut, Trash2, CheckCircle2, Clock, MapPin, Calendar as CalendarIcon, Cloud, CloudRain, Wind, Search, Pencil, X } from "lucide-react";

export default function Home() {
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false } });

  if (isUserLoading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
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
      onError: (err) => { toast({ title: "登录失败", description: (err as any).data?.error ?? "请稍后重试", variant: "destructive" }); }
    }
  });

  const registerMut = useRegister({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "注册成功" }); },
      onError: (err) => { toast({ title: "注册失败", description: (err as any).data?.error ?? "请稍后重试", variant: "destructive" }); }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">个人仪表盘</h1>
          <p className="text-lg text-slate-600 mb-8">一个简洁、可靠的中文个人数字助理，整合日程、天气和节假日信息，让数据呼吸。</p>
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
                  <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loginMut.isPending}>
                  {loginMut.isPending ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register" className="p-6 m-0">
              <form onSubmit={(e) => { e.preventDefault(); registerMut.mutate({ data: { email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-email">邮箱</Label>
                  <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">密码</Label>
                  <Input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={registerMut.isPending}>
                  {registerMut.isPending ? "注册中..." : "注册并登录"}
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoutMut = useLogout({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "已退出登录" }); }
    }
  });

  const { data: bootstrap, isLoading } = useGetBootstrap();

  if (isLoading || !bootstrap) {
    return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center"><div className="animate-pulse">加载仪表盘...</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b sticky top-0 z-10 px-6 h-16 flex items-center justify-between shadow-sm">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            {user.email.charAt(0).toUpperCase()}
          </span>
          个人仪表盘
        </h1>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{user.email}</span>
          <Button variant="ghost" size="sm" onClick={() => logoutMut.mutate()} className="text-slate-500 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-2" /> 退出
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <ClockPanel weather={bootstrap.weather} />
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <ReminderPanel memos={bootstrap.memos} />
            <CityManagerPanel cities={bootstrap.cities} />
          </div>

          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <MemoPanel memos={bootstrap.memos} />
            <CalendarHolidayPanel holidays={bootstrap.holidays} />
          </div>
        </div>
      </main>
    </div>
  );
}

function ClockPanel({ weather }: { weather: any }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('zh-CN', { hour12: false });
  const dateString = time.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-blue-600 text-white">
      <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-6xl font-bold tracking-tighter mb-2 font-mono tabular-nums">{timeString}</div>
          <div className="text-xl text-blue-100">{dateString}</div>
        </div>
        {weather ? (
          <div className="mt-4 md:mt-0 bg-white/15 rounded-2xl px-6 py-4 flex items-center gap-6 backdrop-blur-sm border border-white/20">
            <div className="text-center">
              <div className="text-4xl font-light tabular-nums">{weather.temperature}°<span className="text-2xl text-blue-100">C</span></div>
              <div className="text-blue-100 text-sm mt-1">{weather.weatherLabel}</div>
            </div>
            <div className="h-12 w-px bg-white/25" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <MapPin className="w-3.5 h-3.5" /> {weather.cityName}
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <CloudRain className="w-3.5 h-3.5" /> 湿度 {weather.humidity}%
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <Wind className="w-3.5 h-3.5" /> 风速 {weather.windSpeed} km/h
              </div>
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
  const [now, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const queryClient = useQueryClient();
  const ackMut = useAckReminder({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }) }
  });

  const activeReminders = memos.filter(m =>
    m.remindAt && !m.reminderAcknowledgedAt && new Date(m.remindAt) <= now
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          到点提醒
          {activeReminders.length > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full ml-auto">
              {activeReminders.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[220px]">
          {activeReminders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">当前没有活动的提醒</div>
          ) : (
            <div className="divide-y border-slate-100">
              {activeReminders.map(m => (
                <div key={m.id} className="p-4 bg-orange-50/50 hover:bg-orange-50 transition-colors">
                  <h4 className="font-medium text-slate-900 mb-1">{m.title}</h4>
                  <div className="text-sm text-slate-500 mb-3">{new Date(m.remindAt).toLocaleString('zh-CN')}</div>
                  <Button
                    size="sm" variant="outline"
                    className="w-full border-orange-200 text-orange-700 hover:bg-orange-100"
                    onClick={() => ackMut.mutate({ id: m.id })}
                    disabled={ackMut.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> 我知道了
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
        setQuery(""); searchMut.reset();
        toast({ title: "城市已添加" });
      }
    }
  });
  const deleteCityMut = useDeleteCity({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }) }
  });
  const setDefaultMut = useSetDefaultCity({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() }) }
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud className="w-5 h-5 text-primary" /> 城市管理
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) searchMut.mutate({ data: { query } }); }} className="flex gap-2">
          <Input placeholder="搜索城市..." value={query} onChange={e => setQuery(e.target.value)} className="bg-slate-50 border-0" />
          <Button type="submit" variant="secondary" disabled={searchMut.isPending}><Search className="w-4 h-4" /></Button>
        </form>

        {searchMut.data?.results && searchMut.data.results.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm divide-y">
            {searchMut.data.results.map((r: any, i: number) => (
              <div key={i} className="p-2 px-3 flex items-center justify-between text-sm">
                <span>{r.name} <span className="text-slate-400 text-xs ml-1">{r.admin1} {r.country}</span></span>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => addCityMut.mutate({ data: { ...r } })}>添加</Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">已保存城市</h4>
          {cities.length === 0 ? (
            <div className="text-sm text-slate-400">暂无保存的城市，搜索后添加</div>
          ) : (
            cities.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-slate-50 group">
                <span className="flex items-center gap-2">
                  {c.name}
                  {c.isDefault && <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded">默认</span>}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!c.isDefault && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setDefaultMut.mutate({ id: c.id })}>设为默认</Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteCityMut.mutate({ id: c.id })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MemoPanel({ memos }: { memos: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [viewMemo, setViewMemo] = useState<any | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMut = useCreateMemo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
        resetForm();
        toast({ title: "备忘录已保存" });
      }
    }
  });

  const updateMut = useUpdateMemo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
        resetForm();
        setViewMemo(null);
        toast({ title: "备忘录已更新" });
      }
    }
  });

  const deleteMut = useDeleteMemo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
        setViewMemo(null);
        toast({ title: "备忘录已删除" });
      }
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setContent(""); setRemindAt(""); setImageDataUrl("");
  };

  const startEdit = (memo: any) => {
    setEditingId(memo.id);
    setTitle(memo.title);
    setContent(memo.content || "");
    setRemindAt(memo.remindAt ? memo.remindAt.slice(0, 16) : "");
    setImageDataUrl(memo.imageDataUrl || "");
    setViewMemo(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImageDataUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      content: content || null,
      remindAt: remindAt ? new Date(remindAt).toISOString() : null,
      imageDataUrl: imageDataUrl || null,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload });
    } else {
      createMut.mutate({ data: payload });
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">备忘录</CardTitle>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>取消编辑</Button>
          )}
        </CardHeader>
        <CardContent className="p-0 grid md:grid-cols-2">
          <div className="p-4 border-r border-slate-100 flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input placeholder="标题..." value={title} onChange={e => setTitle(e.target.value)} required className="bg-slate-50 border-0" />
              <Textarea placeholder="内容..." value={content} onChange={e => setContent(e.target.value)} className="min-h-[90px] resize-none bg-slate-50 border-0" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">提醒时间</Label>
                  <Input type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} className="bg-slate-50 border-0 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">图片附件</Label>
                  <Input type="file" accept="image/*" onChange={handleFileChange} className="bg-slate-50 border-0 text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary" />
                </div>
              </div>
              {imageDataUrl && (
                <div className="relative rounded-md overflow-hidden bg-slate-100 h-24 w-24">
                  <img src={imageDataUrl} alt="preview" className="object-cover w-full h-full" />
                  <button type="button" onClick={() => setImageDataUrl("")} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editingId ? "更新备忘录" : "添加备忘录"}
              </Button>
            </form>
          </div>

          <div className="bg-slate-50/50">
            <ScrollArea className="h-[350px]">
              {memos.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">还没有备忘录，左侧创建一个吧。</div>
              ) : (
                <div className="divide-y border-slate-100">
                  {memos.map(m => (
                    <div
                      key={m.id}
                      className="p-4 hover:bg-white transition-colors group cursor-pointer"
                      onClick={() => setViewMemo(m)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-slate-900">{m.title}</h4>
                        <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 shrink-0">
                          点击查看
                        </span>
                      </div>
                      {m.content && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">{m.content}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        {m.remindAt && (
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-sm">
                            <Clock className="w-3 h-3" /> {new Date(m.remindAt).toLocaleString('zh-CN')}
                          </span>
                        )}
                        {m.imageDataUrl && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-sm text-slate-600">附图片</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewMemo} onOpenChange={(open) => { if (!open) setViewMemo(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl pr-8">{viewMemo?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {viewMemo?.content && (
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{viewMemo.content}</p>
            )}
            {viewMemo?.remindAt && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-md px-3 py-2">
                <Clock className="w-4 h-4 shrink-0" />
                提醒时间：{new Date(viewMemo.remindAt).toLocaleString('zh-CN')}
                {viewMemo.reminderAcknowledgedAt && (
                  <span className="ml-auto text-slate-400 text-xs">已确认</span>
                )}
              </div>
            )}
            {viewMemo?.imageDataUrl && (
              <img src={viewMemo.imageDataUrl} alt="附件图片" className="rounded-lg w-full max-h-64 object-contain bg-slate-100" />
            )}
            <p className="text-xs text-slate-400">
              更新于 {viewMemo && new Date(viewMemo.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (viewMemo) deleteMut.mutate({ id: viewMemo.id }); }}
              disabled={deleteMut.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" /> 删除
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewMemo(null)}>关闭</Button>
              <Button size="sm" onClick={() => viewMemo && startEdit(viewMemo)}>
                <Pencil className="w-4 h-4 mr-1" /> 编辑
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CalendarHolidayPanel({ holidays }: { holidays: any[] }) {
  const [month, setMonth] = useState<Date>(new Date());

  const holidayDates = holidays.map((h: any) => new Date(h.date + "T00:00:00"));

  const holidayByDateStr = new Map<string, any[]>();
  for (const h of holidays) {
    const key = h.date;
    if (!holidayByDateStr.has(key)) holidayByDateStr.set(key, []);
    holidayByDateStr.get(key)!.push(h);
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" /> 日历与节假日
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
              className="w-full"
            />
          </div>
          <div>
            <ScrollArea className="h-[340px]">
              <div className="p-4 space-y-1">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">未来 90 天节假日</h4>
                {holidays.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-8">近期没有节假日</div>
                ) : (
                  holidays.map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 text-sm truncate">{h.localName || h.name}</div>
                        {h.localName && h.name !== h.localName && (
                          <div className="text-xs text-slate-400 truncate">{h.name}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-sm font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-md tabular-nums">
                        {h.date}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
