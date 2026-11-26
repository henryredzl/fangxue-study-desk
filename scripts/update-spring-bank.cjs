const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pick = (ask, choices, answer, why, extra = {}) => ({type:'pick', ask, choices, answer, why, ...extra});
const multi = (ask, choices, answer, why, extra = {}) => ({type:'multi', ask, choices, answer, why, ...extra});
const order = (ask, choices, answer, why) => ({type:'order', ask, choices, answer, why});
const write = (ask, answer, why) => ({type:'write', ask, answer, why});
function fill(ask, answer, why, units = '', extra = {}) {
  const accepted = Array.isArray(answer) ? answer : [String(answer)];
  if (units) accepted.push(`${answer}${units}`);
  return {type:'fill', ask, answer:accepted, why, ...(typeof answer === 'number' ? {inputMode:Number.isInteger(answer) ? 'numeric' : 'decimal'} : {}), ...extra};
}
const topic = (id, title, unit, lesson, example, questions) => ({id:`g3b-${id}`, book:'g3b', title, unit, lesson, example, questions});

const cn = [
  topic('spring-scenes','想象画面与品词','可爱的生灵','边读边想像看到的颜色、形状或动作，也听听句子里的声音。','“小雨在荷叶上敲了几下。”把雨点写得像在敲鼓。',[
    pick('“泥融飞燕子，沙暖睡鸳鸯。”诗里哪种动物在飞？',['鸳鸯','燕子','蜻蜓'],1,'“飞燕子”写燕子飞，“睡鸳鸯”写鸳鸯睡。'),
    pick('哪一句最能让你想象小草冒出泥土的样子？',['我家门口有小草。','草地很好看。','小草探出嫩绿的小脑袋。'],2,'“探出”有动作，“嫩绿”写出了颜色。'),
    multi('“柳丝轻轻拂过水面，小雨在荷叶上叮咚作响。”能从句子里想象出哪些细节？',['柳枝的动作','雨点的声音','太阳的颜色','荷叶的大小'],[0,1],'“拂过”写动作，“叮咚”写声音。'),
    write('北京班级要做春游观察卡。选一种你见过的小动物，用两句话写它的样子和一个动作。','一只圆圆的瓢虫趴在嫩叶上，红背上有几个黑点。它慢慢爬到叶尖，张开翅膀飞走了。','自查：读者能想象动物的样子，也能看清它做了什么。')]),
  topic('fables','读寓言、懂道理','小故事大道理','先说人物做了什么、结果怎样，从事情的因果中找道理。','等着兔子自己撞上树桩，说明偶然的好运不能当作长久办法。',[
    pick('读完寓言，想找出道理，可以先问自己什么？',['主人公用了几个名字？','故事用了几个标点？','人物怎么做，结果怎样？'],2,'人物的做法和结果之间，常常藏着寓言的道理。'),
    pick('哪种做法像“守株待兔”？',['总结一次比赛经验后继续练习','偶然答对一题，就天天等同一道题出现','遇到困难先找方法'],1,'把一次偶然的事当成以后都会发生，正像守株待兔。'),
    pick('小猴搬果子，见到更新鲜的就丢下手里的。最后忙了一路，两手空空。这则故事最可能提醒什么？',['选定目标后，做事要有始有终。','只要跑得够快，就会有果子。','见到任何果子都不能摘。'],0,'小猴为新的果子反复丢下已有的东西，最终没有完成任务。'),
    write('上海班级讨论寓言。小明第一次没有复习却顺利过关，后来他说每次都不用复习。请用“守株待兔”的道理劝一劝。','那次可能碰巧遇到了熟悉的题，像兔子偶然撞到树桩。平时认真练习，遇到新题也更有把握。','自查：点出偶然好运，给出具体做法，语气友好。')]),
  topic('experiment','观察实验与段落顺序','留心观察','按过程记录，用“先、接着、最后”写清步骤，把变化写具体。','先放干纸巾，接着滴水，最后观察水印慢慢变大。',[
    pick('写实验过程，哪三个词适合提示先后？',['又、也、连','先、接着、最后','非常、十分、格外'],1,'先、接着、最后能交代实验的先后次序。'),
    pick('哪句话是具体观察结果？',['这个实验真神奇。','我做了一个有趣的实验。','一分钟后，纸巾上的水印从小圆点变成了一个大圆。'],2,'第三句写清了什么时候和怎样变化。'),
    order('把种子观察步骤按先后排好。',['第三天记录小芽的样子。','先把两颗豆子放在湿纸巾上。','每天添一点水，让纸巾保持湿润。'],[1,2,0],'先布置观察材料，再照顾种子，最后记录变化。'),
    write('广州校园的科学小报需要一段观察记录。请写出一次简单的观察或小实验，包含至少两个步骤和一个结果。','我先把一小块冰放在盘子里，再把盘子移到阳光下。十分钟后，冰变小了，盘子里多了一圈水。','自查：步骤有先后，结果来自观察，有看得见的变化。')]),
  topic('tradition','传统文化与段落大意','中华传统文化','找关键语句，再用相关细节检查它能否概括全段。','“我们用几种方式庆祝中秋”可以概括做灯笼、赏月和分享月饼。',[
    fill('清明时节雨纷纷，路上行人欲（　）。',['断魂'],'“断魂”形容诗中行人愁苦的心情。'),
    pick('段落写了做灯笼、猜灯谜和吃元宵。用哪一句概括最合适？',['元宵节的活动很丰富。','灯笼都是绿色的。','大家只喜欢吃元宵。'],0,'三个细节都是元宵节活动。'),
    multi('“手艺人先用竹条做骨架，再糊上一层纸，最后在纸上画花。一盏纸灯笼就做成了。”概括制作过程时应保留哪些动作？',['吃元宵','做骨架','糊纸','画花'],[1,2,3],'做骨架、糊纸、画花是制作顺序。'),
    write('深圳班级准备一张端午节展板。材料写了包粽子、挂艾草、看龙舟。请写一句总起句，再选一件事写得具体一点。','端午节有许多有趣的习俗。包粽子时，我们把粽叶卷成小漏斗，装进糯米，再用细绳扎好。','自查：第一句概括几个习俗，第二句给出能想象的动作。')]),
  topic('imagine','把奇妙想象写清楚','想象习作','先设定一个有意思的变化，再沿着它写行动、遇到的问题和结果。','一把伞会飞，先写它怎么起飞，再写它飞去哪里、帮助了谁。',[
    pick('写“如果铅笔能说话”，最适合接着写哪个情节？',['我数了数桌子有几条腿。','铅笔小声提醒我，它的笔尖断了。','太阳每天从东方升起。'],1,'情节承接“铅笔能说话”的想象。'),
    pick('“我缩得像一粒米，要跨过水洼。”哪种办法最贴合这一设定？',['迈一步就过去。','把一片落叶当作船。','开一辆真正的公共汽车过去。'],1,'变小后落叶可以充当船，情节符合设定。'),
    order('按“变化—遇到问题—解决问题”排一排。',['我借着叶子滑过了水洼。','我醒来，发现自己只有豆粒大。','门口的水洼对我像一条河。'],[1,2,0],'先说明变小，再交代困难，最后写解决办法。'),
    write('北京班级征集故事。以“书包长出了一双翅膀”为开头，写三四句话，交代它做了一件什么事。','书包长出了一双翅膀。它看到窗外的风把小卡片吹上了树，就扑扑翅膀飞过去，把卡片叼了回来。','自查：想象前后一致，动作和结果清楚，读者能跟上故事。')]),
  topic('characters','从细节认识人物','童年趣事','先说人物有什么特点，再从动作、语言或做事结果里找依据。','“她一张张抚平彩纸，再按颜色装好。”可以看出她做事细心。',[
    pick('要让别人看出同桌做事利落，应该写什么？',['记下同桌的鞋号','只说他很厉害','写出一次他很快把材料整理好的过程'],2,'具体的事情和动作能说明人物特点。'),
    pick('“小陶提着两袋书，见小宇够不到书架，就先放下自己的书，帮他把书取了下来。”小陶最可能有什么特点？',['乐于帮忙','特别调皮','说话声音小'],0,'先放下自己的东西帮助别人，表现了热心。'),
    multi('哪些描写可以用来说明小诗很细心？',['她把借来的书一页页翻过，夹回翘起的书签。','她跑得最快。','她核对名字后又数了一遍本子。','她喜欢红色。'],[0,2],'检查和核对都是能看出她细心的动作。'),
    write('上海班级给同学做人物卡片。选身边一个人，写一个特点，再用一件小事说明。','我的同桌很有耐心。我第一次折纸没对齐，她慢慢把角对好给我看，又陪我从头折了一次。','自查：特点清楚，小事中有动作，能支持这个特点。')]),
  topic('aspects','分方面说清楚','奇妙的世界','介绍一个事物时，可以选形状、颜色、变化等不同方面，每个方面放具体信息。','写云朵时，先说形状，再说傍晚变了什么颜色。',[
    pick('把同一个事物介绍得更清楚，可以怎样安排材料？',['把每个细节随意打乱','选几个方面，分别介绍','把同一个词写三次'],1,'分方面组织信息，读者更容易记住重点。'),
    pick('现在要介绍荷叶的形状，哪句最合适？',['荷叶圆圆的，像一把小伞。','荷叶上停了一只蜻蜓。','荷叶在雨后更绿。'],0,'圆圆的、小伞都能让人想象形状。'),
    multi('“这块石头像竖起的小耳朵。雨一下，它又从浅灰变成深灰。”材料分别写了哪些方面？',['形状','重量','颜色变化','味道'],[0,2],'第一句写形状，第二句写雨前雨后颜色不同。'),
    write('广州自然观察角要做一张展签。请从两个不同方面介绍一种你熟悉的花、叶子或石头。','这片枫叶像一只张开的小手。正面是鲜红色，翻过来却浅一些，能看到一条条叶脉。','自查：两个方面不同，每个方面都有具体细节。')]),
  topic('retell','抓住情节复述','有趣的故事','先理出起因、经过和结果，再用自己的话说给别人听。','发现书包拿错、寻找同学、换回书包，是三个主要情节。',[
    pick('复述故事应该保留哪些内容？',['所有原文句子','主要人物和关键情节','课文叙述用了多少字'],1,'复述用自己的话讲清故事主干。'),
    pick('“风吹走了图画，小林追到操场，最后在树边捡到了。”故事的起因是什么？',['在树边捡到了','小林跑到操场','风吹走了图画'],2,'风吹走图画使后面的追赶发生。'),
    order('按故事发生的顺序排列。',['阿元借来了竹竿，把球拨了下来。','阿元把球踢得太高，球停在树枝间。','大家拿回球，接着一起玩。'],[1,0,2],'球卡住是起因，想办法取球是经过，继续玩是结果。'),
    write('深圳班级做一分钟故事分享。“小喜没带伞。小羽撑伞送她到门口。小喜第二天画了一张感谢卡。”请用自己的话简要复述。','放学时下雨，小喜手上没有伞。小羽用自己的伞送她到门口，第二天，小喜画了一张卡片感谢她。','自查：讲出了谁遇到困难、谁帮忙和事情最后怎样。')])
];

const math = [
  topic('motion','平移、旋转和轴对称','生活中的运动现象','沿直线移动且方向保持原样是平移，绕着一个点转是旋转。沿一条线对折，两边能完全重合的图形是轴对称图形。','拉开直轨抽屉是平移，钟表指针绕着中心转是旋转。',[
    pick('钟表的分针绕中心运动，属于哪一种？',['平移','旋转','对折'],1,'分针的一端固定，它绕中心转动。'),
    multi('哪些例子可以看成平移？',['直着往上拉窗帘','风扇叶片转动','抽屉沿直轨拉开','拧开瓶盖'],[0,2],'窗帘和抽屉整体沿直线移，风扇与瓶盖发生转动。'),
    pick('一张正方形纸沿对角线对折，两边会怎样？',['完全重合','一边多出一条长方形纸条','只重合一点'],0,'这条对角线是正方形的一条对称轴。'),
    pick('北京教室用一张对折的纸剪蝴蝶，展开后两半完全重合。用到了什么？',['轴对称','旋转','计数'],0,'对折的折痕是对称轴。')]),
  topic('divide','除数是一位数的除法','数与运算','从最高位开始试商。每次得到的余数要小于除数，再把下一位落下来继续除。','264 ÷ 3 = 88。2 个百不够分，可把 26 个十先除以 3。',[
    fill('84 ÷ 4 =（　）',21,'8 个十除以 4 得 2 个十，4 个一除以 4 得 1 个一。'),
    pick('408 ÷ 4 的商是哪一个？',['12','102','120'],1,'4 个百分出 1 个百，十位商 0，8 个一分出 2 个一。'),
    fill('一张记录显示 256 张彩纸被平均分进 4 个盒子。每盒多少张？',64,'256 ÷ 4 = 64。2 个百不足以分，先用 25 个十除以 4。','张'),
    pick('上海学校有 95 个杯子，每袋最多装 6 个，装完至少需要几个袋子？',['15 个','16 个','17 个'],1,'95 ÷ 6 = 15 余 5，剩下的 5 个也需要 1 个袋子。')]),
  topic('perimeter','长方形和正方形的周长','图形的认识与测量','周长是图形一周的长度。长方形周长是（长＋宽）×2，正方形周长是边长×4。','长 8 厘米、宽 3 厘米的长方形周长是 (8＋3)×2 = 22 厘米。',[
    fill('边长 7 厘米的正方形，周长是多少厘米？',28,'四条边一样长，7×4=28。','厘米'),
    pick('量课桌桌面周长，应该量什么？',['桌面的一周','整个桌面铺了多少方格','桌腿的高度'],0,'周长只计算桌面边界一圈的长度。'),
    fill('周长 34 厘米的长方形纸片，长 10 厘米，宽是多少厘米？',7,'34÷2=17 厘米是长加宽。17−10=7。','厘米'),
    fill('广州班级做长 9 分米、宽 5 分米的长方形展板，四周都贴边带。需要多少分米？',28,'四周共有两条长，两条宽。(9＋5)×2=28。','分米')]),
  topic('area','长方形与正方形的面积','图形的面积','面积表示表面有多大。先把长和宽统一单位，长方形面积用长×宽，正方形面积用边长×边长。','长 6 厘米、宽 4 厘米的长方形面积是 24 平方厘米。',[
    fill('边长 5 厘米的正方形，面积是多少平方厘米？',25,'5×5=25，面积单位是平方厘米。','平方厘米'),
    pick('练习本封面的面积约是 300（　）。填哪个单位合适？',['平方厘米','厘米','千米'],0,'封面大小用面积单位表示，平方厘米合适。'),
    fill('看方格图。每个小方格是 1 平方厘米，绿色长方形的面积是多少平方厘米？',15,'每行 5 格，一共 3 行，5×3=15。','平方厘米',{visual:'spring-area'}),
    fill('深圳班做美术底板，长 9 分米、宽 4 分米。整块底板面积是多少平方分米？',36,'长方形面积＝长×宽。9×4=36。','平方分米')]),
  topic('area-units','面积单位换算','图形的面积','相邻的平方米、平方分米、平方厘米之间的进率都是 100。用 10×10 的方格帮助记忆。','边长 1 分米的正方形也可看作 10 厘米×10 厘米，面积是 100 平方厘米。',[
    fill('4 平方分米 =（　）平方厘米。',400,'1 平方分米＝100 平方厘米。4×100=400。','平方厘米'),
    pick('2 平方米和 190 平方分米，哪个大？',['190 平方分米','一样大','2 平方米'],2,'2 平方米是 200 平方分米，大于 190 平方分米。'),
    fill('一块地小牌标明面积是 600 平方厘米，换成平方分米是多少？',6,'600÷100=6 平方分米。','平方分米'),
    fill('北京图书角铺了 3 平方米地垫，又铺了 40 平方分米。这里共铺多少平方分米？',340,'先换算：3 平方米＝300 平方分米。300＋40＝340。','平方分米')]),
  topic('survey','从统计表找信息','数据的收集与整理','先看行和列分别表示什么，再读交叉格。相加求总数，相减求相差。','两组同学分别读了 9 本和 6 本书，合计 15 本，相差 3 本。',[
    pick('记录同学喜欢的运动，每听到一次就记一次。接下来怎样整理比较方便？',['把记录全部擦掉','按运动项目计数','只写自己最喜欢的'],1,'按项目计数，才能比较每项的人数。'),
    pick('同一张表的栏目是“红队”和“蓝队”。想看蓝队选跳绳的人数，应找哪一格？',['蓝队与跳绳交叉的格','红队与跳绳交叉的格','所有队伍的总人数'],0,'读表时要同时对准项目和队伍。'),
    fill('看活动记录表。两队选择跳绳的共有多少人？',15,'红队 8 人，蓝队 7 人。8＋7＝15。','人',{visual:'spring-survey'}),
    fill('上海班级统计春游路线。选湖边的有 18 人，选花圃的有 12 人。选湖边的比选花圃的多多少人？',6,'相差用减法。18−12＝6。','人')]),
  topic('calendar','年、月、日与时间','年、月、日的秘密','用日历看每月的天数。结束时刻减去开始时刻，求的是经过的时间。','14:00 到 16:00 经过 2 小时。下午 2:00 写成 14:00。',[
    pick('4 月有多少天？',['28 天','30 天','31 天'],1,'4、6、9、11 月都是 30 天。'),
    pick('下午 3:20 用 24 时计时法怎样表示？',['03:20','12:20','15:20'],2,'下午 3 时加 12 小时，得到 15 时 20 分。'),
    pick('2028 年的 2 月有几天？',['28 天','29 天','30 天'],1,'2028 能被 4 整除而且不是整百年份，是闰年。'),
    fill('广州自然观察活动从 9:40 到 10:15，经过多少分钟？',35,'9:40 到 10:00 是 20 分钟，再到 10:15 是 15 分钟。','分钟')]),
  topic('decimals','认识小数与简单加减','小数的初步认识','比较小数先比较整数部分。做加减时小数点对齐，让元和元、角和角对齐。','1.5 元是 1 元 5 角，1.5＋0.3＝1.8 元。',[
    fill('把 3 元 7 角写成小数，是（　）元。',['3.7','3.7元'],'3 写在个位，7 角是 0.7 元。'),
    pick('3.8 与 4.2 比较，哪一个大？',['3.8','4.2','两个数一样大'],1,'先比整数部分。4 大于 3，所以 4.2 大。'),
    fill('文具卡写着：铅笔 2.7 元，橡皮 1.5 元。一共多少元？',4.2,'2 元 7 角加 1 元 5 角，12 角等于 1 元 2 角，共 4.2 元。','元'),
    fill('深圳校园义卖中，小宁有 8.5 元，买卡片用了 4.7 元，还剩多少元？',3.8,'85 角减 47 角等于 38 角，也就是 3.8 元。','元')])
];

const en = [
  topic('meet','认识新朋友','Unit 1 · Meeting new people','用 Where are you from? 问对方来自哪里，用 I’m from … 回答。','Hi, I’m Lin. I’m from China.',[
    pick('Which word is a country?',['teacher','China','classroom'],1,'China 是国家名称。'),
    pick('同学问 “Where are you from?”，怎样回答？',['I’m from China.','I’m nine.','It is on the desk.'],0,'问题询问来自哪里。'),
    pick('听录音。Lily 来自哪里？',['中国','加拿大','英国'],1,'from 后面听到 Canada。',{audio:'Hello! My name is Lily. I am from Canada.'}),
    order('北京班级迎来一位新同学。把询问“你来自哪里？”的片段排好。',['you from?','Where','are'],[1,2,0],'完整句子是 Where are you from?')]),
  topic('describe','描述样子与特征','Unit 2 · Expressing yourself','用 big、small、long、short 描述特征。It has … 用来介绍一个事物有什么。','It has a long tail. 它有一条长尾巴。',[
    pick('Which word means “长的”？',['long','short','small'],0,'long 的意思是“长的”。'),
    pick('哪一句表示“它有两只大耳朵”？',['It has big eyes.','It has two big ears.','It has a long tail.'],1,'big ears 是大耳朵，two 表示两只。'),
    pick('听录音。大象的鼻子是什么样的？',['长的','短的','很小的'],0,'a long nose 表示长鼻子。',{audio:'The elephant has big ears and a long nose.'}),
    fill('上海班级的动物卡写着 “It has a ____ tail.” 要表达“短尾巴”，填哪个词？',['short'],'short tail 表示短尾巴。')]),
  topic('learning','用英语听懂学习指令','Unit 3 · Learning better','找指令里的动词和物品。open 是打开，read 是读，write 是写。','Open your book and read the word. 打开书并读这个单词。',[
    pick('哪个词表示“写”？',['read','write','see'],1,'write 是“写”。'),
    pick('老师说 “Close your book.” 你应该做什么？',['合上书','打开书','举起手'],0,'close 是“合上，关上”。'),
    pick('听录音。老师叫同学们第一步做什么？',['写单词','读单词','打开书'],2,'第一句是 Open your book.。',{audio:'Open your book. Write the word. Then read it.'}),
    pick('广州手工课上，你想礼貌地借一支铅笔。哪句最合适？',['Can I use your pencil, please?','I see a pencil.','This pencil is red.'],0,'Can I use …, please? 可以礼貌询问能不能使用一件东西。')]),
  topic('food','健康饮食与礼貌用语','Unit 4 · Healthy food','用 I’d like …, please. 表达想吃喝什么。rice 是米饭，vegetables 是蔬菜。','I’d like some vegetables, please. 我想要一些蔬菜。',[
    pick('Which word means “米饭”？',['milk','rice','fish'],1,'rice 表示米饭。'),
    pick('你想表达“我想要些水，谢谢”，选哪句？',['I’d like some water, please.','I see some water.','I have a toy.'],0,'I’d like …, please. 是礼貌提出请求的方式。'),
    multi('听录音。说话的人点了什么？',['汤','米饭','牛奶','鸡蛋'],[0,1],'听到 rice and soup，表示米饭和汤。',{audio:'I would like some rice and soup, please.'}),
    order('深圳健康餐分享会上，你想说“我想要一些水果，谢谢”。把片段排好。',['some fruit,','please.','I’d like'],[2,0,1],'完整句子是 I’d like some fruit, please.')]),
  topic('toys','玩具和位置','Unit 5 · Old toys','用 Where is …? 找物品。in 表示在里面，on 表示在上面，under 表示在下面。','The toy car is in the box. 玩具车在盒子里。',[
    pick('哪个词表示“在……下面”？',['in','on','under'],2,'under 表示在下面。'),
    pick('答句 “It’s on the desk.” 能回答哪句？',['How old are you?','Where is the toy car?','What colour is your desk?'],1,'答句给了位置，应答 Where 的问题。'),
    pick('听录音。玩具船在哪里？',['椅子下面','桌子上面','盒子里'],0,'under the chair 是在椅子下面。',{audio:'The toy boat is under the chair.'}),
    fill('北京共享玩具架旁，玩具熊在盒子里。把句子补完整：The bear is ____ the box.',['in'],'in the box 是在盒子里面。')]),
  topic('prices','数量和价格','Unit 6 · Numbers in life','读清 eleven 到 twenty。How many …? 问件数，How much …? 可以问价格。','How many pencils? — Twelve. How much are they? — Ten yuan.',[
    pick('Which number is fifteen?',['13','15','50'],1,'fifteen 是 15。'),
    pick('想问彩笔多少钱，怎么说？',['How many crayons?','How old are you?','How much are the crayons?'],2,'How much 可以询问价格。'),
    pick('听录音。彩笔多少钱？',['5 元','15 元','50 元'],1,'听到 fifteen yuan，表示 15 元。',{audio:'These crayons are fifteen yuan.'}),
    fill('上海校园义卖有 18 个书签。把 “There are ____ bookmarks.” 补完整，写出英文数字。',['eighteen'],'eighteen 表示 18。')]),
  topic('spring-phonics','单词拼读与辨音','Letters and sounds','读熟悉的单词对比元音，尝试听出哪个单词发音和其他不同。','cap 和 cat 中的 a 发短音，cake 里的 a 发字母名的音。',[
    pick('cat 和哪个单词的元音发音一样？',['cake','cap','name'],1,'cat 和 cap 的 a 都发短音。'),
    pick('哪一个单词的元音和其他两个不一样？',['bike','five','fish'],2,'bike、five 里的 i 发字母名的音，fish 里的 i 发短音。'),
    multi('哪些单词中的元音发音和 note 一样？',['nose','not','home','hot'],[0,2],'note、nose 和 home 中的 o 发字母名的音。'),
    fill('广州班制作英文标签。“帽子”的单词是 “c_p”，补上一个英文小写字母。',['a'],'帽子是 cap。')]),
  topic('spring-reading','读清单与生活对话','综合复习','先看题目问数量、地点还是价格，再去材料中定位对应的词。','two toy cars 是数量，under the bed 是位置，fifteen yuan 是价格。',[
    pick('读 “I am from the UK.” 这句话提供了什么信息？',['来自哪里','有几个玩具','物品的价格'],0,'from 后面是来自的地方。'),
    pick('卡片写着 “Toy boats: 12 yuan each.” 说明什么？',['每个玩具船 12 元','玩具船共有 12 个','船要放在 12 号架上'],0,'yuan 表示元，each 表示每一个。'),
    multi('读清单：“12 pencils. 2 toy cars. The cars are under the desk.” 哪些信息正确？',['有 12 支铅笔','有 2 辆玩具车','玩具车在桌子下面','铅笔都在盒子里'],[0,1,2],'清单写了两种物品的数量和玩具车的位置。'),
    write('深圳班级交换旧玩具。简短介绍你带来的玩具，再写一句它放在哪里。','This is my toy car. It is in the box.','自查：两句说清楚玩具和位置，句首大写、句末有标点。')])
];

const size = 8;
const batch = fn => Array.from({length:size},(_,index)=>fn(index));
const remedial = (id,title,unit,category,lesson,groups) => ({
  id:`g3b-calc-${id}`, book:'g3b', title, unit, lesson,
  drill:{size, category, sets:groups.map(([name])=>name)},
  questions:groups.flatMap(([,questions])=>questions)
});

function division(dividend, divisor, place) {
  const quotient = Math.floor(dividend/divisor);
  const remainder = dividend % divisor;
  const check = `${quotient} × ${divisor}${remainder ? `＋${remainder}` : ''}＝${dividend}。`;
  const guidance = '从最高位开始试商。用商乘除数，再加余数来验算。';
  if (place === '余数') return fill(`用竖式计算 ${dividend} ÷ ${divisor}。余数是多少？`,remainder,`商是 ${quotient}。${dividend}−${quotient}×${divisor}＝${remainder}。余数小于 ${divisor}。`,'',{hint:guidance});
  if (remainder) return fill(`用竖式计算 ${dividend} ÷ ${divisor}。整数商是多少？`,quotient,`商是 ${quotient}，还余 ${remainder}。验算：${check}`,'',{hint:guidance});
  return fill(`${dividend} ÷ ${divisor} =（　）`,quotient,`商是 ${quotient}。验算：${check}`,'',{hint:guidance});
}

function mentalDivision(factor, divisor, place) {
  const dividend = factor * divisor * place;
  const label = place === 100 ? '百' : '十';
  return fill(`口算 ${dividend} ÷ ${divisor} =（　）`,factor*place,
    `${dividend} 是 ${factor*divisor} 个${label}，除以 ${divisor} 得 ${factor} 个${label}，也就是 ${factor*place}。`,'',
    {hint:`想想 ${dividend} 是几个${label}，然后再分。`});
}

function decimal(a,b,subtract) {
  const sign = subtract ? '−' : '+';
  const left = (a/10).toFixed(1), right=(b/10).toFixed(1);
  const tenths = subtract ? a-b : a+b;
  const answer = (tenths/10).toFixed(1);
  return fill(`${left} ${sign} ${right} =（　）`, [...new Set([answer,String(tenths/10)])],
    `把两个数分别看成 ${a} 个和 ${b} 个十分之一。${a} ${sign} ${b}＝${tenths}，也就是 ${answer}。`,'',
    {inputMode:'decimal',hint:'竖式里先把两个小数点对齐，再计算。'});
}

const drills = [
  remedial('mental-divide','口算除法与估算','除数是一位数的除法','除法','先把被除数看成几个十或百，或选一个好除的数来估算。',[
    ['整十、几百几十除以一位数',batch(i=>mentalDivision(i+2,3+i%5,10))],
    ['整百数除以一位数',batch(i=>mentalDivision(i+2,2+i%3,100))],
    ['用接近且好除的数估算',batch(i=>{
      const divisor = i+2, near = divisor*(i+2)*10, actual=near+(i%2?4:-3);
      return fill(`把 ${actual} 看成 ${near}，${actual} ÷ ${divisor} 约等于多少？`, near/divisor, `${near} ÷ ${divisor}＝${near/divisor}。`,'',{hint:`把被除数换成题目给出的 ${near}，口算。`});
    })]
  ]),
  remedial('written-divide','笔算除法与余数','除数是一位数的除法','除法','从最高位开始试商。商某一位不够 1，要用 0 占位。余数必须小于除数。',[
    ['两位数与三位数笔算',[84,156,192,264,315,432,595,728].map((n,i)=>division(n,[3,3,4,4,5,6,7,8][i]))],
    ['商中间或末尾有 0',[303,420,612,816,515,363,540,702].map((n,i)=>division(n,[3,6,6,8,5,3,2,7][i]))],
    ['求有余数的商或余数',batch(i=>{
      const divisor=i+2, q=10+i*2, remainder=i+1;
      return division(divisor*q+remainder,divisor,i%2?'余数':'商');
    })]
  ]),
  remedial('perimeter','周长计算','长方形和正方形','周长与面积','绕边界一周得到周长。长方形有两条长和两条宽，正方形四条边相等。',[
    ['正方形周长',batch(i=>{
      const side=i+6; return fill(`正方形的边长是 ${side} 厘米，周长是多少厘米？`,side*4,`${side}×4＝${side*4}。`,'厘米',{hint:'一共有 4 条一样长的边。'});
    })],
    ['长方形周长',batch(i=>{
      const a=i+8,b=3+i%4; return fill(`长方形长 ${a} 厘米、宽 ${b} 厘米，周长是多少厘米？`,2*(a+b),`(${a}＋${b})×2＝${2*(a+b)}。`,'厘米',{hint:'先算一条长和一条宽的和。'});
    })],
    ['从周长倒推边长',batch(i=>{
      const a=9+i,b=4+i%3,p=(a+b)*2; return fill(`长方形周长 ${p} 分米，长 ${a} 分米，宽多少分米？`,b,`${p}÷2＝${a+b}，${a+b}−${a}＝${b}。`,'分米',{hint:'用一半周长减去长。'});
    })]
  ]),
  remedial('area','面积计算和换算','图形的面积','周长与面积','面积表示铺满表面需要多少单位方格。长方形的面积是长×宽，面积单位的进率按边长展开。',[
    ['正方形面积',batch(i=>{
      const n=i+3; return fill(`正方形的边长是 ${n} 分米，面积是多少平方分米？`,n*n,`${n}×${n}＝${n*n}。`,'平方分米',{hint:'每行的方格数和行数相等。'});
    })],
    ['长方形面积',batch(i=>{
      const a=7+i,b=4+i%3; return fill(`长方形长 ${a} 厘米，宽 ${b} 厘米，面积是多少平方厘米？`,a*b,`${a}×${b}＝${a*b}。`,'平方厘米',{hint:'用长乘宽。'});
    })],
    ['面积单位换算',batch(i=>{
      const [large,small]=i%2?['平方米','平方分米']:['平方分米','平方厘米'];
      const n=3+i;
      if(i<4) return fill(`${n} ${large} =（　）${small}`,n*100,`1 ${large}＝100 ${small}，${n}×100＝${n*100}。`,small,{hint:'大单位换成小单位，乘进率。'});
      return fill(`${n*100} ${small} =（　）${large}`,n,`1 ${large}＝100 ${small}，${n*100}÷100＝${n}。`,large,{hint:'小单位换成大单位，除以进率。'});
    })]
  ]),
  remedial('decimal','小数大小与加减','小数的初步认识','小数','用元和角理解一位小数。小数加减要对齐数位，比较时先看整数部分。',[
    ['一位小数加法',[ [16,25],[24,19],[37,16],[45,18],[53,28],[62,19],[71,25],[83,17] ].map(([a,b])=>decimal(a,b,false))],
    ['一位小数减法',[ [46,21],[51,28],[63,34],[74,38],[82,15],[91,46],[105,67],[112,53] ].map(([a,b])=>decimal(a,b,true))],
    ['一位小数比大小',[[32,29],[19,21],[45,45],[56,59],[78,71],[60,60],[16,61],[92,85]].map(([a,b])=>{
      const left=(a/10).toFixed(1), right=(b/10).toFixed(1);
      const options=['<','=','>'], result=a===b?1:a<b?0:2;
      const detail=a===b?'整数部分和十分位分别相同。':Math.floor(a/10)!==Math.floor(b/10)?'整数部分不一样，先比较整数部分。':'整数部分一样，再看十分位。';
      return pick(`${left}（　）${right}`,options,result,`${detail}${left} ${options[result]} ${right}。`,{hint:'先看小数点左边。左边相同，再看小数点右边第一位。'});
    })]
  ]),
  remedial('calendar','年月日与时间推算','年、月、日的秘密','年月日','把 24 时计时法、日历和时间间隔一起练熟。求经过时间时先用同一种计时法。',[
    ['月份和天数',[1,3,4,5,6,7,9,11].map(month=>{
      const days=[4,6,9,11].includes(month)?30:31;
      return fill(`${month} 月有多少天？`,days,`${month} 月有 ${days} 天。`,'天',{hint:'4、6、9、11 月有 30 天。'});
    })],
    ['24 时计时法',batch(i=>{
      const time=2+i;
      return fill(`下午或晚上的 ${time} 时，写成 24 时计时法是（　）时。`,time+12,`${time}＋12＝${time+12}。`,'时',{hint:'中午 12 时过后，转换时加 12。'});
    })],
    ['跨整点求经过时间',batch(i=>{
      const start=8+i, minute=34+i*3, end=7+i*4;
      return fill(`一项活动从 ${start}:${minute} 到 ${start+1}:${String(end).padStart(2,'0')}。经过多少分钟？`,60-minute+end,
        `先算到 ${start+1}:00 有 ${60-minute} 分钟，再加 ${end} 分钟，共 ${60-minute+end} 分钟。`,'分钟',{hint:'把时间分成整点前和整点后两段。'});
    })]
  ])
];

const additions = {cn, math:[...math,...drills], en};
const htmlPath = path.join(__dirname,'..','index.html');
const html = fs.readFileSync(htmlPath,'utf8');
const region = /(<script id="question-bank" type="application\/json">)[\s\S]*?(<\/script>)/;
const match = html.match(region);
assert.ok(match,'Question bank not found');
const bank = JSON.parse(match[0].slice(match[1].length,-match[2].length));
for (const [subject,list] of Object.entries(additions)) bank[subject] = [...bank[subject].filter(entry=>entry.book !== 'g3b'),...list];
for (const item of Object.values(additions).flat()) {
  assert.equal(item.questions.length,item.drill ? size * item.drill.sets.length : 4,item.id);
}
const topics = Object.values(bank).flat();
assert.equal(new Set(topics.map(item=>item.id)).size,topics.length,'Duplicate topic ID');
const formatted = JSON.stringify(bank,null,2).replaceAll('<','\\u003c');
let output = html.replace(region,(_,start,end)=>`${start}\n${formatted}\n${end}`);

if (process.argv[2]) {
  const tracks = JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
  const expected = en.flatMap(item=>item.questions.flatMap((q,index)=>q.audio?[`${item.id}-${index+1}`]:[]));
  assert.deepEqual(Object.keys(tracks).sort(),expected.sort(),'Missing or unexpected spring audio');
  const audioRegion = /const audioTracks = (\{[^\r\n]*\});/;
  assert.ok(output.match(audioRegion),'Audio track list not found');
  output = output.replace(audioRegion,(_,existing)=>`const audioTracks = ${JSON.stringify({...JSON.parse(existing),...tracks})};`);
}
if (output !== html) fs.writeFileSync(htmlPath,output);
const total = Object.values(additions).flat().reduce((n,item)=>n + item.questions.length,0);
console.log(`Spring bank: ${total} questions including ${drills.length * size * 3} calculation drills.`);
