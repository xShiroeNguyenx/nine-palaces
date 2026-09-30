// Kiểm thử đầu cuối API trên server local (wrangler dev, DEV_LOGIN=1).
// Chạy: pnpm --filter @np/api smoke   (API mặc định http://localhost:8787)
import WebSocket from 'ws';

const API = process.env.API_URL ?? 'http://localhost:8787';
const WS = API.replace(/^http/, 'ws');
let failures = 0;

function check(cond, label) {
  if (cond) console.log(`  ✔ ${label}`);
  else {
    failures++;
    console.log(`  ✘ ${label}`);
  }
}

async function post(path, body, token) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function get(path, token) {
  const res = await fetch(API + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function connect(path) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS + path);
    const messages = [];
    const waiters = [];
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      messages.push(msg);
      for (const w of [...waiters]) {
        if (w.pred(msg)) {
          waiters.splice(waiters.indexOf(w), 1);
          clearTimeout(w.timer);
          w.resolve(msg);
        }
      }
    });
    const client = {
      ws,
      messages,
      send: (m) => ws.send(JSON.stringify(m)),
      waitFor: (pred, label = 'message', timeout = 5000) =>
        new Promise((res, rej) => {
          const found = messages.find(pred);
          if (found) {
            messages.splice(messages.indexOf(found), 1);
            return res(found);
          }
          const w = { pred, resolve: (m) => (messages.splice(messages.indexOf(m), 1), res(m)) };
          w.timer = setTimeout(() => {
            waiters.splice(waiters.indexOf(w), 1);
            rej(new Error(`Hết thời gian chờ: ${label}`));
          }, timeout);
          waiters.push(w);
        }),
      lastState: () => [...messages].reverse().find((m) => m.type === 'room:state')?.state,
      close: () => ws.close(),
    };
    ws.on('open', () => resolve(client));
    ws.on('error', reject);
  });
}

const isState = (pred) => (m) => m.type === 'room:state' && pred(m.state);

async function main() {
  console.log(`API: ${API}`);
  const health = await get('/api/health');
  check(health.status === 200, 'health OK');

  // --- Đăng nhập ---
  const alice = await post('/api/auth/dev-login', { name: 'Alice' });
  const bob = await post('/api/auth/dev-login', { name: 'Bob' });
  const guest = await post('/api/auth/guest', { deviceId: `device-${Date.now()}` });
  check(alice.status === 200 && alice.body.token, 'dev-login Alice');
  check(guest.status === 200 && guest.body.user.isGuest, 'guest login');
  const A = alice.body.token;
  const B = bob.body.token;
  const G = guest.body.token;

  // Guest không được tạo ván xếp hạng
  const guestRated = await post(
    '/api/rooms',
    { timeControl: null, rated: true, private: false, side: 'red', training: false },
    G,
  );
  check(guestRated.status === 403, 'guest không tạo được ván xếp hạng');

  // --- Phòng giao hữu ---
  console.log('\nPhòng giao hữu');
  const room = await post(
    '/api/rooms',
    { timeControl: { initialMs: 300000, incrementMs: 3000 }, rated: false, private: false, side: 'red', training: true },
    A,
  );
  check(room.status === 200 && /^[A-Z2-9]{6}$/.test(room.body.code), `tạo phòng ${room.body?.code}`);
  const code = room.body.code;
  const info = await get(`/api/rooms/${code}`);
  check(info.status === 200 && info.body.red?.name === 'Alice', 'thông tin phòng: Alice cầm Đỏ');

  const a = await connect(`/api/rooms/${code}/ws?token=${A}`);
  await a.waitFor(isState((s) => s.you === 'red'), 'A là Đỏ');
  const b = await connect(`/api/rooms/${code}/ws?token=${B}`);
  await b.waitFor(isState((s) => s.you === 'black'), 'B là Đen');
  const g = await connect(`/api/rooms/${code}/ws?token=${G}`);
  await g.waitFor(isState((s) => s.you === 'spectator'), 'G là khán giả');
  check(true, 'A=Đỏ, B=Đen, G=khán giả');

  a.send({ type: 'room:ready', ready: true });
  b.send({ type: 'room:ready', ready: true });
  await a.waitFor(isState((s) => s.status === 'playing'), 'bắt đầu ván');
  check(true, 'ván bắt đầu khi cả hai sẵn sàng');

  // Đi sai lượt
  b.send({ type: 'game:move', seq: 0, move: 'h7e7' });
  const err = await b.waitFor((m) => m.type === 'error', 'lỗi sai lượt');
  check(err.code === 'not_your_turn', 'chặn đi sai lượt');

  const moves = ['h2e2', 'h9g7', 'h0g2', 'i9h9'];
  for (let i = 0; i < moves.length; i++) {
    const who = i % 2 === 0 ? a : b;
    who.send({ type: 'game:move', seq: i, move: moves[i] });
    await a.waitFor((m) => m.type === 'game:moved' && m.seq === i, `nước ${i}`);
    await b.waitFor((m) => m.type === 'game:moved' && m.seq === i, `nước ${i} (B)`);
    await g.waitFor((m) => m.type === 'game:moved' && m.seq === i, `nước ${i} (khán giả)`);
  }
  check(true, '4 nước đi đồng bộ tới cả người chơi và khán giả');

  // Nước không hợp lệ
  a.send({ type: 'game:move', seq: 4, move: 'a0a5' });
  const illegal = await a.waitFor((m) => m.type === 'error', 'nước sai');
  check(illegal.code === 'illegal_move', 'chặn nước không hợp lệ');

  // Xin đi lại
  a.send({ type: 'game:move', seq: 4, move: 'i0h0' });
  await b.waitFor((m) => m.type === 'game:moved' && m.seq === 4, 'nước 5');
  a.send({ type: 'game:requestUndo' });
  await b.waitFor((m) => m.type === 'game:offer' && m.kind === 'undo', 'đề nghị đi lại');
  b.send({ type: 'game:respondUndo', accept: true });
  const afterUndo = await a.waitFor(isState((s) => s.moves.length === 4), 'sau khi đi lại');
  check(afterUndo.state.moves.length === 4, 'đi lại thành công (còn 4 nước)');

  // Cầu hòa bị từ chối
  a.send({ type: 'game:offerDraw' });
  await b.waitFor((m) => m.type === 'game:offer' && m.kind === 'draw', 'đề nghị hòa');
  b.send({ type: 'game:respondDraw', accept: false });
  await a.waitFor((m) => m.type === 'game:offerDeclined', 'từ chối hòa');
  check(true, 'cầu hòa / từ chối');

  // Chat
  a.send({ type: 'chat:send', text: 'Chào bạn, đm' });
  const chat = await g.waitFor((m) => m.type === 'chat:message', 'chat tới khán giả');
  check(chat.message.text === 'Chào bạn, **', `lọc từ trong chat: "${chat.message.text}"`);
  g.send({ type: 'chat:send', text: 'Khán giả xin chào' });
  const specChat = await a.waitFor((m) => m.type === 'chat:message' && m.message.channel === 'spectators', 'chat khán giả');
  check(!!specChat, 'ván giao hữu: người chơi thấy chat khán giả');

  // Kết nối lại: A đóng rồi mở lại
  a.close();
  const reconnected = await b.waitFor(isState((s) => s.red && s.red.connected === false), 'A mất kết nối');
  check(!!reconnected, 'B thấy A mất kết nối');
  const a2 = await connect(`/api/rooms/${code}/ws?token=${A}`);
  const st = await a2.waitFor(isState((s) => s.you === 'red'), 'A kết nối lại');
  check(st.state.moves.length === 4 && st.state.status === 'playing', 'A kết nối lại, giữ nguyên ván');

  // Đầu hàng + đánh lại
  b.send({ type: 'game:resign' });
  const ended = await a2.waitFor((m) => m.type === 'game:ended', 'kết thúc');
  check(ended.result.winner === 'red' && ended.result.reason === 'resign', 'Đen đầu hàng → Đỏ thắng');
  a2.send({ type: 'game:rematch' });
  await b.waitFor((m) => m.type === 'game:offer' && m.kind === 'rematch', 'đề nghị đánh lại');
  b.send({ type: 'game:rematch' });
  const re = await a2.waitFor(isState((s) => s.status === 'playing' && s.gameNo === 2), 'ván 2');
  check(re.state.you === 'black', 'đánh lại: đổi màu (A cầm Đen)');
  a2.close();
  b.close();
  g.close();

  // --- Ván xếp hạng ---
  console.log('\nVán xếp hạng');
  const rroom = await post(
    '/api/rooms',
    { timeControl: { initialMs: 180000, incrementMs: 2000 }, rated: true, private: true, side: 'black', training: true },
    A,
  );
  check(rroom.status === 200 && rroom.body.key, 'tạo phòng riêng xếp hạng có khóa');
  const rcode = rroom.body.code;
  const noKey = await get(`/api/rooms/${rcode}`);
  check(noKey.status === 403, 'phòng riêng: thiếu khóa bị từ chối');
  const k = rroom.body.key;
  const ra = await connect(`/api/rooms/${rcode}/ws?token=${A}&k=${k}`);
  const rs = await ra.waitFor(isState((s) => s.you === 'black'), 'A cầm Đen');
  check(rs.state.settings.training === false, 'Luyện Trình bị tắt ở ván xếp hạng');
  const rg = await connect(`/api/rooms/${rcode}/ws?token=${G}&k=${k}`);
  const gerr = await rg.waitFor((m) => m.type === 'error' && m.code === 'login_required', 'guest không ngồi ghế');
  check(!!gerr, 'guest vào ván xếp hạng thành khán giả');
  const rb = await connect(`/api/rooms/${rcode}/ws?token=${B}&k=${k}`);
  await rb.waitFor(isState((s) => s.you === 'red'), 'B cầm Đỏ');
  ra.send({ type: 'room:ready', ready: true });
  rb.send({ type: 'room:ready', ready: true });
  await ra.waitFor(isState((s) => s.status === 'playing'), 'bắt đầu xếp hạng');
  const rmoves = ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0'];
  for (let i = 0; i < rmoves.length; i++) {
    (i % 2 === 0 ? rb : ra).send({ type: 'game:move', seq: i, move: rmoves[i] });
    await ra.waitFor((m) => m.type === 'game:moved' && m.seq === i, `xh nước ${i}`);
  }
  await new Promise((r) => setTimeout(r, 300));
  const specState = rg.lastState();
  check(specState && specState.moves.length === 2 && specState.hiddenMoves === 3, `khán giả trễ 3 nước (thấy ${specState?.moves.length})`);
  ra.send({ type: 'game:requestUndo' });
  const undoErr = await ra.waitFor((m) => m.type === 'error', 'không cho đi lại');
  check(undoErr.code === 'undo_not_allowed', 'ván xếp hạng không cho xin đi lại');
  ra.send({ type: 'game:resign' });
  const rend = await rb.waitFor((m) => m.type === 'game:ended', 'kết thúc xếp hạng');
  check(rend.ratingDelta && rend.ratingDelta.red > 0 && rend.ratingDelta.black < 0, `Elo thay đổi ${JSON.stringify(rend.ratingDelta)}`);
  const finalSpec = await rg.waitFor(isState((s) => s.status === 'ended'), 'khán giả thấy kết thúc');
  check(finalSpec.state.moves.length === 5, 'kết thúc: khán giả thấy đủ nước');
  ra.close();
  rb.close();
  rg.close();

  const me = await get('/api/me', B);
  check(me.status === 200 && me.body.ratings.some((r) => r.mode === 'blitz' && r.elo > 1200), 'hồ sơ có Elo blitz > 1200');
  check(me.body.progress.totalWins >= 1, 'tiến trình: đã cộng trận thắng online');
  const matches = await get('/api/me/matches', A);
  check(matches.status === 200 && matches.body.length >= 2, `lịch sử trận: ${matches.body?.length}`);
  const detail = await get(`/api/matches/${rend.matchId}`);
  check(detail.status === 200 && detail.body.movesList.length === 5, 'chi tiết trận có danh sách nước');
  const lb = await get('/api/leaderboard?mode=blitz');
  check(lb.status === 200 && lb.body.length >= 2, 'bảng xếp hạng blitz');

  // Đồng bộ tiến trình
  const put = await fetch(`${API}/api/me/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${G}` },
    body: JSON.stringify({ xp: 250, totalWins: 3, unlockWins: 2, aiLevelUnlocked: 4, aiWins: { 1: 1, 2: 1, 3: 1 }, streak: 3, bestStreak: 3 }),
  });
  const merged = await put.json();
  check(put.status === 200 && merged.aiLevelUnlocked === 4, 'đồng bộ tiến trình (không thu hồi mở khóa)');

  // --- Danh sách phòng công khai ---
  const pub = await get('/api/rooms/public');
  check(pub.status === 200 && pub.body.some((r) => r.code === code), 'phòng công khai xuất hiện trong danh sách xem trận');
  check(!pub.body.some((r) => r.code === rcode), 'phòng riêng không xuất hiện');

  // --- Ghép trận nhanh ---
  console.log('\nGhép trận nhanh');
  const la = await connect(`/api/lobby/ws?token=${A}`);
  const lb2 = await connect(`/api/lobby/ws?token=${B}`);
  const tc = { initialMs: 600000, incrementMs: 5000 };
  la.send({ type: 'queue:join', rated: true, timeControl: tc });
  await la.waitFor((m) => m.type === 'queue:joined', 'A vào hàng đợi');
  lb2.send({ type: 'queue:join', rated: true, timeControl: tc });
  const fa = await la.waitFor((m) => m.type === 'match:found', 'A ghép được');
  const fb = await lb2.waitFor((m) => m.type === 'match:found', 'B ghép được');
  check(fa.code === fb.code, `hai người được ghép cùng phòng ${fa.code}`);
  const qa = await connect(`/api/rooms/${fa.code}/ws?token=${A}`);
  const qs = await qa.waitFor(isState((s) => s.you !== 'spectator'), 'A ngồi ghế');
  check(qs.state.red && qs.state.black && qs.state.settings.rated, 'phòng ghép trận đã có đủ 2 ghế, xếp hạng');
  const lg = await connect(`/api/lobby/ws?token=${G}`);
  lg.send({ type: 'queue:join', rated: true, timeControl: tc });
  const lgErr = await lg.waitFor((m) => m.type === 'error', 'guest xếp hạng');
  check(lgErr.code === 'login_required', 'guest không ghép trận xếp hạng');
  la.close();
  lb2.close();
  lg.close();
  qa.close();

  // --- Cờ úp ---
  console.log('\nCờ úp');
  const jroom = await post(
    '/api/rooms',
    { timeControl: null, rated: true, private: false, side: 'red', training: true, variant: 'jieqi' },
    A,
  );
  check(jroom.status === 200, `tạo phòng cờ úp ${jroom.body?.code}`);
  const ja = await connect(`/api/rooms/${jroom.body.code}/ws?token=${A}`);
  const jstate = await ja.waitFor(isState((s) => s.you === 'red'), 'A vào cờ úp');
  check(jstate.state.settings.variant === 'jieqi' && jstate.state.settings.rated === false, 'cờ úp: luôn giao hữu');
  const jb = await connect(`/api/rooms/${jroom.body.code}/ws?token=${B}`);
  await jb.waitFor(isState((s) => s.you === 'black'), 'B vào cờ úp');
  ja.send({ type: 'room:ready', ready: true });
  jb.send({ type: 'room:ready', ready: true });
  await ja.waitFor(isState((s) => s.status === 'playing'), 'bắt đầu cờ úp');
  ja.send({ type: 'game:move', seq: 0, move: 'h2e2' }); // quân úp ở vị trí Pháo đi như Pháo
  const jm = await jb.waitFor((m) => m.type === 'game:moved', 'nước cờ úp');
  check(/^h2e2=[abnrcp]$/.test(jm.move), `nước lật quân có chú thích danh tính: ${jm.move}`);
  check(jm.events.some((e) => e.type === 'reveal'), 'sự kiện lật quân');
  const raw = JSON.stringify(jb.lastState() ?? {});
  check(!raw.includes('identity'), 'không lộ danh tính quân úp trong trạng thái phòng');
  ja.close();
  jb.close();

  if (process.env.SMOKE_SLOW === '1') {
    console.log('\nHết giờ & bỏ cuộc (mất ~65 giây)');
    const mk = async (tc) => {
      const r = await post('/api/rooms', { timeControl: tc, rated: false, private: false, side: 'red', training: false }, A);
      const x = await connect(`/api/rooms/${r.body.code}/ws?token=${A}`);
      const y = await connect(`/api/rooms/${r.body.code}/ws?token=${B}`);
      await y.waitFor(isState((s) => s.you === 'black'), 'B vào');
      x.send({ type: 'room:ready', ready: true });
      y.send({ type: 'room:ready', ready: true });
      await x.waitFor(isState((s) => s.status === 'playing'), 'bắt đầu');
      return { x, y };
    };
    const t = await mk({ initialMs: 30000, incrementMs: 0 });
    const ab = await mk(null);
    ab.x.send({ type: 'game:move', seq: 0, move: 'h2e2' });
    await ab.y.waitFor((m) => m.type === 'game:moved', 'nước đầu');
    ab.y.close(); // Đen rời đi, không quay lại
    const [timeoutEnd, abandonEnd] = await Promise.all([
      t.y.waitFor((m) => m.type === 'game:ended', 'hết giờ', 40000),
      ab.x.waitFor((m) => m.type === 'game:ended', 'bỏ cuộc', 75000),
    ]);
    check(timeoutEnd.result.reason === 'timeout' && timeoutEnd.result.winner === 'black', 'Đỏ hết giờ → Đen thắng');
    check(abandonEnd.result.reason === 'abandon' && abandonEnd.result.winner === 'red', 'Đen mất kết nối > 60s → Đỏ thắng');
    t.x.close();
    t.y.close();
    ab.x.close();
  }

  console.log(failures === 0 ? '\nTẤT CẢ ĐỀU QUA' : `\n${failures} KIỂM TRA THẤT BẠI`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('LỖI:', e);
  process.exit(1);
});
