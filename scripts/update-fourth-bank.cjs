'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cityBank = require('../city-bank.js');

const pick = (ask, choices, answer, why, extra = {}) => ({type:'pick',ask,choices:choices.split('|'),answer,why,...extra});
const multi = (ask, choices, answer, why) => ({type:'multi',ask,choices:choices.split('|'),answer,why});
const order = (ask, choices, answer, why) => ({type:'order',ask,choices:choices.split('|'),answer,why});
const write = (ask, answer, why) => ({type:'write',ask,answer,why});
const fill = (ask, answer, why, inputMode = 'text') => ({type:'fill',ask,answer:String(answer).split('|'),why,inputMode});
const listen = (audio, ask, choices, answer, why) => pick(ask,choices,answer,why,{audio});
const topic = (book,id,title,unit,lesson,example,questions) => ({book,id:`${book}-${id}`,title,unit,lesson,example,questions});
const upper = (...args) => topic('g4a',...args);
const lower = (...args) => topic('g4b',...args);

const chinese = [
  upper('scenery','按顺序读景、品关键词','自然景观','用时间或地点词梳理描写顺序，再找声音、颜色和动作。','“水面先发白，不一会儿白浪就推到岸边。”抓住先后和浪的动作。',[
    pick('“午后水面发亮，傍晚水色转深。”按什么顺序写？','时间先后|从左到右|从高到低',0,'“午后”“傍晚”是时间线索。'),
    pick('“溪水绕过石头”换成“溪水跨过石头”，哪个意思变了？','水的颜色|水经过石头的方式|石头的大小',1,'绕是转着走，跨是从上面过去。'),
    multi('“晨雾散开，河面亮起碎银似的光，船桨划出轻轻的哗啦声。”有哪些可想象的细节？','河面的亮光|划船的声音|河水的甜味|晚霞的颜色',[0,1],'“亮起”写视觉，“哗啦”写听觉。'),
    write('在北京校园观察角写两三句话，记录树影从午后到傍晚的变化。','午后，梧桐的影子短短地贴着树根。傍晚，它拉得很长，越过小路，伸到了花坛边。','自查时间先后、同一景物和具体变化。')]),
  upper('questions','从内容、写法和启示提问','阅读策略','读完先标出疑问，再区分问“写了什么”“怎么写”和“读完想到什么”。','“为什么用‘蹿’写小猫？”是从写法提问。',[
    pick('问“这个段落为什么先写声音再写画面”，属于什么角度？','写法|生字笔顺|作者年龄',0,'它在问材料的组织方式。'),
    pick('读校园植物介绍时，哪个问题最值得回到材料验证？','这株植物在哪种环境长得更好？|排版用了几号字？|文章有几个句号？',0,'第一个问题直接关系材料介绍的内容。'),
    multi('短文写叶片遇水后，水滴沿叶尖滚落。哪些问题紧扣材料？','水滴从哪儿落下？|换成长短不同的叶尖会怎样？|校门几点开？|文章印在第几页？',[0,1],'前两问能从原文寻找线索或继续观察。'),
    write('在上海读书角，围绕“蚂蚁遇到积水后沿草叶绕过去”分别提出一个内容问题和一个拓展问题。','内容：蚂蚁沿着什么绕过积水？拓展：如果旁边没有草叶，它还能怎么走？','内容问题能在文中找答案，拓展问题由材料出发继续想。')]),
  upper('observe','连续观察和观察日记','处处留心','固定观察对象，在几个时点用同一标准记录，用具体变化作证。','记录叶片数，可以从周一的两片比到周五的四片。',[
    pick('跟踪豆芽生长，哪种记录最可比较？','每天同一时间量同一株的芽长|每天换一株只写好不好看|只在最后数花盆',0,'固定对象、时间和观察指标便于比较。'),
    pick('哪句把猜测和观察混在了一起？','芽高 4 厘米。|芽朝窗边弯。|小芽一定在想念太阳。',2,'前两句可以直接核实，第三句推测了植物的想法。'),
    order('把三条观察记录按时间排列。','第三天，芽顶冒出两片叶。|第一天，豆皮裂了一道缝。|第二天，从裂口钻出白芽。',[1,2,0],'先开裂，再出芽，最后长叶。'),
    write('广州自然角邀请你写两条同对象、不同日期的观察记录，再写一句比较。可用假设数据。','周一，同一株豆苗高 3 厘米，叶片刚展开。周四，它高 6 厘米，叶子更宽了。这几天它长高了约 3 厘米。','两次用同一对象和指标，比较要能从记录核实。')]),
  upper('myth','理清神话情节与人物特点','神话阅读','抓起因、经过、结果，区分神奇想象和人物行为体现的品质。','用神奇的石船救村民，重点先看“救”的行动。',[
    pick('神话里，哪处最能体现超出日常的想象？','河边长满芦苇|女孩用一粒种子变出大桥|大家走过木桥',1,'种子突然变成桥带有神奇想象。'),
    pick('“他抱着最后一盏灯去找迷路的人。”最能看出什么？','愿意帮助别人|喜欢买新灯|十分贪玩',0,'在条件有限时仍拿灯救助别人。'),
    order('按起因、经过、结果重排神话梗概。','河道恢复通畅，百姓能渡河。|一块巨石堵住河道。|小主人公借神力移开巨石。',[1,2,0],'堵塞是起因，搬石是经过，通行是结果。'),
    write('深圳故事会要续写“村庄没有雨，一块会说话的石头愿意帮忙”。写一个有前因后果的情节。','石头告诉阿禾，山背后藏着一条被落叶堵住的水道。阿禾带伙伴清出水道，山泉沿着石头指的方向流进村里的水渠。','保留神奇设定，把帮助方式和结果写清楚。')]),
  upper('event','把一件事写清楚','记事习作','用起因、经过、结果搭出顺序，把最关键的动作写具体。','球卡在树上，借长杆拨球，最后捡回；重点写怎样拨。',[
    pick('写“修好掉链的车”，哪块最适合重点展开？','早上吃了什么|怎样重新套好车链|停车处的告示颜色',1,'文章中心是修车，解决问题的动作值得详写。'),
    pick('哪句能交代事情的起因？','下楼时我发现车胎瘪了。|后来车又能骑了。|我把工具放回柜子。',0,'发现问题才有后面的行动。'),
    order('排列这件事的主要环节。','她给漏气处贴补片。|她发现水里冒气泡。|她把充好气的车骑回家。',[1,0,2],'先发现漏处，再修补，最后说明结果。'),
    write('北京班级故事角请你写“找回一张丢失的借书证”。用三四句话，重点写一个找的动作。','换衣服时我发现借书证不见了。我把昨天用过的书包放平，沿侧袋的缝隙一点点摸。指尖碰到硬角，我轻轻抽了出来，正是借书证。','事情有起因和结果，关键动作让别人能想象找的过程。')]),
  upper('emotion','用动作和环境体会心情','成长故事','从动作、语言和环境找证据，也看这些细节在前后怎样变化。','他一会儿攥袖口，一会儿看门口，可能在焦急等待。',[
    pick('“上台前，她反复揉着稿纸。”最可能是什么心情？','紧张|生气|无聊',0,'上台前反复小动作是紧张的线索。'),
    pick('写等候时的焦急，哪个细节更能表现？','秒针挪一格，她就抬头看一次门。|房间里有长桌。|她穿灰色鞋。',0,'频繁看门显示迫切期待。'),
    multi('“进门前，他脚步慢了；听到队友叫他，他的肩膀松下来，笑着走近。”哪些细节支持后面放松了？','肩膀松下来|笑着走近|进门前脚步慢|门有多宽',[0,1],'松肩和微笑是变化发生后的线索。'),
    write('上海社区活动设一个领奖前的场景，不直接写“紧张”，让动作表现出来。','轮到我上台前，我把纸条翻过去又翻回来。听到主持人念我的名字，我才发现手心已经湿了。','用可以看到的动作或身体反应提示心情。')]),
  upper('summary','概括主要内容与复述','人物与故事','用谁、为什么、做了什么、结果怎样提取主干，复述时适当合并细节。','小舟怕借书迟到，绕路到馆，最终在闭馆前还了书。',[
    pick('概括校园义卖文章，最先保留什么？','完整对话|主要人物和关键事件|每样物品的颜色',1,'主干信息让人听懂发生了什么。'),
    pick('“队友找错集合点，小涵打电话提醒，两队最终准时到达。”哪个概括合适？','小涵提醒找错地点的队友，两队都准时到了。|两队都迷路了。|小涵只负责接电话。',0,'交代了问题、帮助和结果。'),
    multi('“灯坏了。他请管理员开柜、取出备用灯并换上。读书会如期开始。”复述保留什么？','灯坏了|更换备用灯|活动如期开始|管理员的发型',[0,1,2],'保留因果相连的起因、经过和结果。'),
    write('广州广播站征集一句话故事。概括“小队发现路标倒了，互相配合把它扶稳，后来的队员顺利找到方向”。','小队合作扶起倒下的路标，帮助后来的队员找到方向。','保留主要行动与结果，用自己的话完整说。')]),
  upper('letter','写信与有条理地交流','实用表达','写信留意称呼、正文、祝语、署名和日期。正文先交代目的，再说相关细节。','写给同学可以先说感谢的事情，再写自己的感受。',[
    pick('信的称呼写谁？','写信人|收信人|邮递员',1,'称呼指明信写给谁。'),
    pick('写给吴老师请假，哪句最清楚？','我可能有点事。|我明天下午去复诊，想请一节课的假。|我很喜欢上课。',1,'说明时间、原因和请求。'),
    order('把书信这几部分按出现顺序排好。','署名和日期|称呼|正文|祝语',[1,2,3,0],'先称呼，再写正文和祝语，最后署名日期。'),
    write('深圳伙伴卡活动，请给一位同学写一封短信，感谢 TA 在小组活动中的一次帮助。可用化名。','小航：\n谢谢你昨天借我尺子，还陪我重新画了比例线。因为你的提醒，我终于画对了。\n祝你学习顺利！\n小星\n11 月 20 日','称呼和署名分清，感谢写出具体事情。')]),
  lower('rural','从景物细节体会感情','乡村生活','圈画带感情色彩的词，观察景物描写与作者的感受如何相连。','“炊烟亲亲热热地抱住屋檐”传达了熟悉、亲切的感情。',[
    pick('“鸭子晃悠悠地游进水田。”哪个词直接写动作的样子？','水田|晃悠悠|鸭子',1,'“晃悠悠”让人想出游得慢而自在。'),
    pick('“晚风把稻香送到门边。”哪种体会更有依据？','作者喜欢乡间清新的气息|作者害怕晚风|作者讨厌稻子',0,'“送”写得自然亲切，稻香是正面感受。'),
    multi('“井台旁的青苔滑滑的，篱笆里飘来桂花香。”写了什么感官？','触觉|嗅觉|听觉|味觉',[0,1],'“滑滑的”是触感，“桂花香”是气味。'),
    write('北京校园征文请你写熟悉的一处乡间或社区景物。选两个细节表达亲切感。','巷口的木门一推就轻轻响。风过时，藤架下面飘着熟悉的花香，我一闻就知道快到家了。','写具体细节，并让读者体会那处景物对你的意义。')]),
  lower('science','读科普、提出问题与说新闻','科普与信息','找描述现象和解释原因的语句，遇到报道时把事实与推测分开。','“试飞三分钟”是记录，“很可能还能更久”是推测。',[
    pick('介绍一架实验纸桥承重时，哪项是可核实的事实？','它肯定永远不会坏。|在这次测试中，它承住了五本书。|它一定是世界上最强的。',1,'限定这次测试，并给出可重复核对的数据。'),
    pick('读“温水中的糖更快消失”，哪问适合设计实验？','水温会不会影响糖的溶解速度？|糖纸是什么牌子？|为什么教室不是红色？',0,'对比水温时保持糖量、水量等条件一致，可检验这一问题。'),
    multi('消息：“周五午休，四年级在阅览室举行了科普分享会，共 6 个小组发言。”哪些是报道中明确的事实？','周五午休|地点是阅览室|6 组发言|所有听众都很激动',[0,1,2],'感受没有出现在消息里。'),
    write('上海校园广播要播报“周三下午，学生在实验室完成纸桥承重测试，三组作品承住 10 本书”。写一两句简讯。','周三下午，学生在实验室进行纸桥承重测试。其中三组作品承住了 10 本书。','什么时候、在哪里、做了什么和结果都来自材料。')]),
  lower('poetry','读现代诗、想画面和节奏','现代诗歌','看分行、反复和意象，再把画面与语气联系起来。','“一阵风来了，/树把影子轻轻摇开。”分行让动作读出停顿。',[
    pick('“云在天边站了一会儿，/又慢慢走了。”把云写得像什么？','在停留、走动的人|要下水的鱼|紧锁的门',0,'“站”“走”赋予云人的动作。'),
    pick('“我等一滴雨，/我等一封信，/我等一阵风。”反复写“我等”有什么作用？','加深等待的感受并形成节奏|只为凑行数|说明三件事完全一样',0,'相同起句让三行读来整齐，也加深了情绪。'),
    multi('“黄昏铺开橙色的纸，/一只燕子写下一道斜线。”诗里有哪些画面元素？','橙色的暮色|燕子斜飞|白雪落地|清晨雾气',[0,1],'颜色和“斜线”分别提示暮色与燕子飞的方向。'),
    write('广州诗歌角征集三行小诗。写雨后的操场，用一种具体颜色和一个动作。','雨停了，\n蓝色的水洼躺在跑道边，\n一阵风给它推开细细的波纹。','分行和停顿与语气一致，画面里能看到颜色和动作。')]),
  lower('animals','读动物描写、比较表达','作家笔下的动物','比较同样的行为用了哪些词，看看动作、语气和比喻怎样表现特点。','“它踱过来”比“它跑过来”更能写出从容。',[
    pick('“小鹅昂着头，一步一步踱来。”哪个特点最贴切？','神气、从容|吵闹、慌乱|非常怕人',0,'昂着头和踱步是关键动作。'),
    pick('想写小猫很警觉，选哪句？','听见门响，它马上竖耳，盯住门缝。|它的碗是黄色。|它睡得特别沉。',0,'迅速注意声响是警觉的表现。'),
    multi('“仓鼠捧起瓜子，一边咬，一边把壳拨开。”哪些观察有依据？','它用前爪拿食物|它边吃边拨壳|它在害怕主人|它讨厌瓜子',[0,1],'前两项来自能观察到的动作。'),
    write('深圳动物观察卡请你写同一种动物的一个动作和一个习惯。','我家的小猫喝水时先伸舌尖轻点水面。太阳照到窗台，它总是跳上去，缩着四只脚躺一会儿。','保持同一个对象；动作可见，习惯写出反复出现的情形。')]),
  lower('tour','按游览顺序写景','观景写景','用路线词串联地点，到每一处先写看到的景物，再详写印象最深的一处。','进门看花坛，沿台阶到亭子，再从亭子看远处。',[
    pick('“出了竹林，沿石阶往上，来到山亭。”这句话起什么作用？','交代地点转换|概括动物习性|说明前后来到同一处',0,'“出了、往上、来到”连成路线。'),
    pick('标题是《游小湖》，哪项宜略写？','从公园门口走到湖边|湖心倒影怎样变化|湖边最让人惊喜的景物',0,'交代到湖即可，主要景物应详写。'),
    order('按从门口到山顶的游览路线排序。','到山顶的小亭远望。|进门先经过桂花道。|沿桂花道走到山腰观景台。',[1,2,0],'路线词和地形从入口向山顶推进。'),
    write('北京公园导览补一段文字。写从入口走到池边，再走到木桥，详写一处。','从东门进去，沿石子路走到池边。水面上几片荷叶挨挨挤挤，风一吹便轻轻点着水。再往前，就到了跨池的小木桥。','交代路线，用一两句具体写重点景物。')]),
  lower('growth','读成长故事、抓住主要经过','成长与责任','按面对的问题、行动和变化梳理故事，挑出推动转变的细节。','从怕开口到练习三次，再到能讲清楚，转变有过程。',[
    pick('“她原本不敢举手，先写了提纲，后来第一次主动发言。”促成变化的行动是什么？','写提纲做准备|坐在前排|穿了新鞋',0,'准备提纲帮助她把想说的话组织起来。'),
    pick('概括“跑步摔倒、重新起身、跑完全程”，哪个关联最清楚？','遇到挫折，坚持完成比赛。|喜欢看别人跑。|摔倒以后放弃。',0,'起身再跑是作出坚持的选择。'),
    multi('“第一次没拼好，第二次她把步骤写在纸上，请朋友检查接口，终于拼好。”有哪些具体行动？','写步骤|请朋友检查|一直等待|把作品藏起来',[0,1],'前两个行动直接推动成功。'),
    write('上海班级小报请用三句话写“第一次没做好，后来改进办法”的经历。','我第一次讲解画作时，把颜色和故事说混了。回家后我写下两个关键词，按先颜色、后故事练习了几次。第二天我按这个顺序讲，听众能听明白了。','先交代问题，再写改变的办法和结果。')]),
  lower('people','从语言、动作和侧面描写读人物','人物品质','把人物评价和具体细节一一对应，分清角色情况和旁人的评价。','“他把最后一页也核对了一遍”比“他很认真”提供了证据。',[
    pick('“大家把难读的稿件交给她核对。”属于哪种表现？','借他人的行动表现她可靠|直接写她的衣着|借景色写四季',0,'他人的选择能侧面反映大家信任她。'),
    pick('哪一细节更能支持“爷爷做事细心”？','把种子一颗颗分开，再贴上名字|门前有两个花盆|爷爷最喜欢雨天',0,'逐个整理和标注显示做事周到。'),
    multi('“比赛结束，阿原主动扶住晃动的展示牌，还提醒伙伴一起把螺丝拧紧。”哪些细节能说明他负责？','主动扶住|提醒把螺丝拧紧|比赛结束|伙伴姓名',[0,1],'两个行为都在照看公共物品。'),
    write('广州同伴名片请介绍一个人的特点，用他的一句话和一个动作作证。','小榆很有耐心。她把积木慢慢移回起点，说：“我们从第一步再试一次。”然后等我自己拼完。','同一特点由语言和动作共同支持。')]),
  lower('fairy','读写童话、保持人物设定','童话阅读与创作','看人物特点与愿望，续写时用同样的规则处理新的问题。','会说话的地图只在夜里提醒方向，续写要保留时间限制。',[
    pick('童话约定只有灯亮时树影才会说话，怎么安排树影开口？','先打开灯|等到全黑|把灯收进抽屉',0,'满足故事给出的必要条件。'),
    pick('小伞怕火、乐于助人，哪种做法符合两个特点？','绕开火堆，用伞面为小鸟挡雨。|跳进火堆唱歌。|把小鸟赶到雨里。',0,'既避火，又主动帮助。'),
    order('把童话的事件排成“遇险—想办法—结果”。','木片把小鸭送到岸边。|溪水上涨，小鸭上不了岸。|青蛙推来一块漂浮的木片。',[1,2,0],'先交代危险，再写解决办法及结果。'),
    write('深圳故事交换活动请你续写“铅笔画出的门，只能让愿意分享的人通过”。写一次尝试及其结果。','小星握着两颗糖，先只想着把它们带进去，门一动不动。她转身分给伙伴一颗糖。铅笔画出的门慢慢开了，两人一起走进去。','规则前后一致；尝试、改变与结果相连。')])
];

const mathematics = [
  upper('place','万以上数的数位和读写','万以上数的认识','从个位起，每四位分一级。先读万级，再读个级。','3 0060 0400 从高到低是 3 亿、60 万、400。',[
    pick('亿位的左边一位是什么位？','千万位|十亿位|万位',1,'相邻数位之间满十进一，亿位左边进到十亿位。'),
    pick('数字 7 在 407 0356 的哪个数位？','千位|万位|十万位',1,'从右往左数第五位是万位。'),
    fill('资料列出“六百零三万零九十”。用阿拉伯数字写这个数。',6030090,'603 万写成 6 030 000，另加 90。','numeric'),
    fill('北京展馆统计：本年接待 23 万人，分馆接待 804 人。合计多少人？',230804,'230 000＋804＝230 804。','numeric')]),
  upper('rounding','四舍五入与估计','万以上数的认识','省略万位后面的尾数，看千位。估算时还要想清楚偏大或偏小有何影响。','857 030 的千位是 7，省略万位后面的尾数约为 86 万。',[
    fill('589 420 四舍五入到万位，约多少万？',59,'千位是 9，向万位进一。','numeric'),
    pick('估算总价是否一定不超预算，哪种做法更有把握？','把各项单价适当估高，估出的总价仍不超过预算|把单价都估低就说够钱|只看最便宜的一项',0,'估高仍够钱，实际总价也在预算内。'),
    multi('仅读近似数，哪些人数约为 18 万（四舍五入到万位）？','175 020|184 500|185 000|169 999',[0,1],'从 175 000 到 184 999 都会舍入为 18 万。'),
    fill('上海社区买 49 盒每盒 18 元的用品。用 50 盒、每盒 20 元来估算，估计总价为多少元？',1000,'两个数都向上估，50×20＝1000 元。','numeric')]),
  upper('protractor','角的分类、度量和画角','角的度量','量角器中心对准顶点，零刻度线对准一条边，再找从这个零出发的刻度。','另一边在内圈 60°、外圈 120°，从内圈零起读就是 60°。',[
    pick('比直角大、比平角小的角叫什么？','锐角|钝角|周角',1,'90°＜角度＜180°。'),
    pick('量同一个角，把两条边都画长，角度怎样变？','变大|变小|不变',2,'角的大小由两边张开的程度决定。'),
    fill('一个平角的一条边起转 47° 后，离平角的另一边还差多少度？','133|133°','180−47＝133。','numeric'),
    pick('广州手作坊要画 125° 的角。先画射线后怎么操作？','顶点对准量角器中心，从射线所在的零起找 125°|从任意一圈的 125° 起画|把量角器中心放射线末端',0,'中心、零线、刻度三步要对应。')]),
  upper('multiply','多位数乘两位数','笔算乘法','先乘个位，再乘十位。第二层积表示若干个十，末位与十位对齐。','126×23＝126×20＋126×3＝2898。',[
    fill('304 × 28 等于多少？',8512,'304×20＝6080，304×8＝2432，合计8512。','numeric'),
    pick('笔算 126×35 时，乘十位上的 3 得到的第二层积实际是多少？','378|3780|37800',1,'十位的 3 表示 30。'),
    fill('表中每组使用 216 枚螺丝，表内有 18 组，一共多少枚？',3888,'216×(20−2)＝4320−432＝3888。','numeric'),
    fill('深圳展板打印 125 张，每张 24 个字。总共印多少个字？',3000,'125×24＝(125×8)×3＝3000。','numeric')]),
  upper('model','加法模型和乘法模型','解决问题','找每份量、份数与总量，先判断相同的量是否重复出现。','每箱 24 本，6 箱共 24×6 本；另有 5 本，最后再加 5。',[
    pick('哪种情况用乘法求总量最直接？','8 个盒子每盒同样放 15 枚|甲袋 8 枚乙袋 15 枚|原有15枚送出8枚',0,'同样的 15 重复 8 次。'),
    pick('每页 12 张贴纸，已有 8 页，再贴 3 页。哪式正确？','12×8＋3|12×(8＋3)|12＋8×3',1,'新增 3 的单位是页，要统一先算总页数。'),
    fill('活动卡：每组 35 套白卡，共 24 组，另留 60 套备用。一共准备多少套？',900,'35×24＋60＝840＋60。','numeric'),
    fill('北京导览队每分钟走 65 米。前 12 分钟和后 8 分钟速度不变，一共走多少米？',1300,'65×(12＋8)＝1300。','numeric')]),
  upper('parallel','平行、垂直和平行四边形与梯形','图形的认识','在同一平面内看直线是否相交。图形分类时数对边平行的组数。','平行四边形有两组对边分别平行，梯形只有一组。',[
    pick('同一平面内，两条直线相交成直角，它们有什么关系？','垂直|平行|重合',0,'垂直的交角是 90°。'),
    pick('判断一个四边形是不是梯形，最应核对什么？','是否只有一组对边平行|四条边是否等长|是否有九十度的角',0,'“只有一组”是梯形的分类条件。'),
    multi('材料说明甲图形有两组对边分别平行，乙图形只有一组。哪些说法正确？','甲是平行四边形|乙是梯形|两者都有两组平行对边|必须先知道面积',[0,1],'对边平行组数已经给出类型。'),
    pick('上海社区要从图书角一点到笔直走廊铺最短连线，应该怎样铺？','垂直于走廊|沿任意斜线|平行于走廊',0,'直线外一点到直线的垂线段最短。')]),
  upper('bar','读单双组条形统计图','数据与比较','看横纵轴、图例和一格表示的数量，按问题取出对应的柱。','每格 5 人，4 格和 6 格分别表示 20 人、30 人。',[
    fill('条形图纵轴每格表示 4 人，某组条高 7 格。这个组有多少人？',28,'7×4＝28。','numeric'),
    pick('比较同一月份两队的人数，要先确认什么？','两队分别对应哪个图例|哪根线画得最细|标题加粗了没有',0,'按图例找到同月的两根条。'),
    {...fill('看第二天的条形图。甲组比乙组多多少份？',10,'甲组 9 格、乙组 7 格，相差 2 格，每格 5 份。','numeric'),
      visual:{kind:'grade-four-bars',step:5,unit:'份',bars:[9,7]}},
    fill('广州手作展条形图中，纸艺和泥塑条分别为 8 格和 6 格，一格代表 3 件。两类合计多少件？',42,'(8＋6)×3＝42。','numeric')]),
  upper('compare-plans','估算、比较方案与等量替换','复习与关联','先用相同单位写清各方案的条件，再按目标比较总量、费用或时间。','两种票都能覆盖所需人数时，再比较总价。',[
    pick('两种箱子最多装同样多的书。优先可以比较什么来选便宜的买法？','买够所需数量时的总价|箱子的印花|店名的字数',0,'比较共同目标下的实际费用。'),
    pick('四辆车每辆 30 座，安排 121 人。只把人数估成 120 会有什么问题？','会漏掉 1 人没座|会多出 4 个座位|没有任何影响',0,'核对真实人数，120 个座位不足。'),
    fill('套餐甲有 4 袋每袋 25 张，套餐乙有 5 袋每袋 18 张；甲比乙多多少张？',10,'100−90＝10。','numeric'),
    fill('深圳活动准备贴纸：A 每包 25 张、9 元，B 每包 10 张、4 元。只买 A 或只买 B，都要恰好买 50 张。两种买法相差几元？',2,'A 买两包 18 元，B 买五包 20 元，差 2 元。','numeric')]),
  lower('operations','四则运算与括号','四则运算','先做括号内，再乘除、后加减。同一级且没有括号，从左往右算。','(168−48)÷6 先求差，再除以 6。',[
    fill('96 ÷ 8 × 3 等于多少？',36,'除和乘同级，先算 96÷8 再乘 3。','numeric'),
    pick('哪一个式子要先算 84−24？','84−24÷3|(84−24)÷3|84÷3−24',1,'括号把 84−24 整成一组。'),
    fill('读算式：360 − (144 ÷ 12 + 29)，算出结果。',319,'先算 144÷12＝12，再得括号内 41，最后 360−41。','numeric'),
    fill('北京活动场地有 180 个座位，其中 36 个留作备用，其余分给 8 组。每组多少个座位？',18,'(180−36)÷8＝18。','numeric')]),
  lower('laws','运算定律与简便计算','运算定律','结合律改变分组，分配律把同一个乘数分别乘括号中的每部分。','125×(8＋4)＝125×8＋125×4。',[
    fill('25 × 17 × 4，先算 25×4，原式等于多少？',1700,'25×4＝100，再乘 17。','numeric'),
    pick('与 37×99 相等的是哪式？','37×100−1|37×100−37|37×100＋37',1,'37 乘 (100−1)，减的是一个 37。'),
    multi('哪些式子与 46×25＋54×25 相等？','(46＋54)×25|100×25|46＋54×25|100＋25',[0,1],'两项有共同乘数 25，可以合并。'),
    fill('上海读书会买 29 份每份 35 元的套装，又补购 1 份同价套装。一共多少元？',1050,'(29＋1)×35＝1050。','numeric')]),
  lower('decimals','小数的意义、大小与近似值','小数的意义和性质','先比整数位，再逐位比较小数。小数末尾添零时数的大小不变。','4.08 小于 4.8，因为十分位 0 小于 8。',[
    fill('小数 7.206 的百分位上是几？',0,'小数点右边第二位是百分位。','numeric'),
    pick('下面哪个数等于 3.04？','3.040|3.40|3.004',0,'只在小数尾部添零才保持原值。'),
    order('把这一组水深按从小到大排好。','4.12 米|4.009 米|4.08 米|4.2 米',[1,2,0,3],'把小数位补齐后逐位比较。'),
    fill('广州展品实测质量是 5.486 千克。四舍五入保留两位小数是多少千克？','5.49|5.490','千分位 6 向百分位进一。','decimal')]),
  lower('decimal-calc','小数加减法','小数的加法和减法','先对齐小数点，必要时在小数末尾补零，再按位加减。','7.2−3.56＝7.20−3.56＝3.64。',[
    fill('12.30 + 0.86 等于多少？','13.16|13.160','百分位满十时向十分位进一。','decimal'),
    pick('列竖式算 5.8−0.43，为什么 8 与 4 对齐？','两者都在十分位|两者都在个位|数字大的要对着小的',0,'小数点对齐后，相同数位自然对齐。'),
    fill('订单的两笔费用是 14.75 元和 8.60 元，另获优惠 3.50 元。实付款是多少元？','19.85|19.850','合计 23.35，再减 3.50。','decimal'),
    fill('深圳展板一条彩带有 9.00 米，用掉 2.85 米和 3.27 米，还剩多少米？','2.88|2.880','9.00−(2.85＋3.27)＝2.88。','decimal')]),
  lower('divide-two','除数是两位数的除法','笔算除法','从高位试商，注意余数要比除数小。用商×除数＋余数验算。','695÷24 商 28 余 23，24×28＋23＝695。',[
    fill('768 ÷ 24 等于多少？',32,'24×32＝768。','numeric'),
    pick('有人算出余数是 19，除数是 18，说明什么？','商偏小还要再试|答案必定正确|余数越大商越大',0,'19 里还含一个 18，商应再增加。'),
    fill('材料处 538 支笔，每 21 支装满一箱。装满后剩下几支？',13,'21×25＝525，538−525＝13。','numeric'),
    fill('北京研学有 257 人，车每辆坐 32 人。至少需要几辆？',9,'32×8＝256，剩 1 人还需一辆。','numeric')]),
  lower('triangles','三角形的分类、三边与内角','三角形','较短两边之和要大于最长边。内角和是 180°，可用它求未知角。','40°＋65°＋75°＝180°。',[
    fill('一个三角形的两个角分别是 38°、72°，第三个角是多少度？','70|70°','180−38−72＝70。','numeric'),
    pick('下列哪组长度不能围成三角形？','4、5、6|3、5、8|5、5、7',1,'3＋5＝8，只能排成一条线。'),
    multi('测量记录为 35°、55°、90°，有哪些正确结论？','是直角三角形|内角和是 180°|是等边三角形|90° 是钝角',[0,1],'有一个直角，三个角相加为 180°。'),
    fill('上海手工架等腰三角形的顶角是 46°。两个相等的底角各是多少度？','67|67°','(180−46)÷2＝67。','numeric')]),
  lower('movement','轴对称、平移和观察物体','图形与空间','平移看方向和格数，对称看对应点到折痕的距离，观察物体先定视角。','图形每个点都向右 3 格，整个图形就向右平移 3 格。',[
    pick('在方格纸上把图形向右平移，哪些量不会变？','形状和大小|点的横向位置|每个点离原处的距离',0,'平移只改变位置，横向位置发生改变。'),
    pick('把图形沿一条线对折，两边能完全重合。这条线叫什么？','对称轴|中心线段|平移路线',0,'能使两边完全重合的折痕所在直线是对称轴。'),
    fill('点 P 在竖直对称轴左侧 5 格。它的对应点在右侧几格？',5,'两点在轴的两侧，与轴等距。','numeric'),
    pick('广州模型桌上的三块方块竖直叠放。从正上方看，能看到几个顶面？','一个|两个|三个',0,'同一位置只露出最上面一个顶面。')]),
  lower('average','平均数与数据解读','统计与比较','用总量除以份数求平均数。平均数能代表总体水平，可以与真实的每个数不同。','11、13、15 的平均数是 13，相当于 15 把多出的 2 给 11。',[
    fill('三个小组分别收集了 18、24、30 片叶子。平均每组多少片？',24,'(18＋24＋30)÷3＝24。','numeric'),
    pick('四人平均得 12 分，下列哪种说法可靠？','总分为 48|人人得 12 分|有三人一定高于 12',0,'按平均数求总量是 12×4。'),
    fill('记录表写着四日读书分钟数：15、25、20、28。每天平均多少分钟？',22,'88÷4＝22。','numeric'),
    fill('深圳小组前三天练跳绳次数是 85、95、90；想让四天平均达到 92 次，第四天至少跳多少次？',98,'92×4−(85＋95＋90)＝98。','numeric')])
];

const english = [
  upper('chores','家务动作与主动帮忙','Helping at home','听出动作和对象，用 Can I help? 先提出帮助。','I can wash the dishes. 表示我可以洗碗。',[
    pick('哪个短语表示“扫地”？','sweep the floor|make the bed|wash the dishes',0,'sweep 是扫，floor 是地面。'),
    pick('“She can ___ the table.” 哪个选项合适？','sets|set|setting',1,'can 后用动词原形 set。'),
    listen('I can put away the toys, but I cannot wash the dishes.','听录音。说话人能帮忙做哪件家务？','收拾玩具|洗碗|晾衣服',0,'but 后的 cannot 提示洗碗是做不了的。'),
    write('北京家庭任务卡需要两句英文：先询问能否帮忙，再说你能擦桌子。','Can I help? I can clean the table.','clean the table 表示擦桌子，第二句给出自己的行动。')]),
  upper('friends','描述朋友、外貌和性格','My friends','用 be 说性格或外形，用 have/has 说拥有的特征。','He is quiet. He has short hair.',[
    pick('“她有长头发。”哪个表达合适？','She has long hair.|She is long hair.|She have long hair.',0,'She 后用 has 来描述拥有的特点。'),
    pick('“Mia is friendly.” 哪个词表示性格？','Mia|friendly|is',1,'friendly 是友好的。'),
    listen('Jack is tall and quiet. Nina is friendly and has short hair.','听录音。谁有短发？','Jack|Nina|两个人都有',1,'has short hair 紧跟在 Nina 的描述里。'),
    write('上海同伴介绍卡，请写两句介绍一位朋友，一句写性格，一句写特征。可用化名。','Lily is friendly. She has short hair.','is 后写特质，has 后写拥有的特征。')]),
  upper('places','社区地点和 there is / are','Places we live in','there is 对应单数，there are 对应复数。看位置时先确定参照物。','There is a park next to the library.',[
    pick('“There ___ two shops near my home.” 填什么？','is|are|am',1,'two shops 是复数。'),
    pick('哪个短语表示“图书馆对面”？','next to the library|behind the library|across from the library',2,'across from 表示在……对面。'),
    listen('There is a post office next to the library. The park is behind the post office.','听录音。公园在什么地方？','邮局后面|图书馆里面|邮局前面',0,'第二句的 behind 和 post office 说明位置。'),
    write('广州社区地图有图书馆和一个在它旁边的公园。用两句话标注这个场景。','There is a library. The park is next to the library.','先交代存在，再用 next to 写相对位置。')]),
  upper('community','社区服务与礼貌请求','Helping in the community','用 Could you 或 Can you 礼貌请求，先确定谁需要什么帮助。','Can you carry this box, please?',[
    pick('想请别人帮忙捡起地上的纸，哪个表达合适？','Can you pick up the paper, please?|Can you open the window, please?|What colour is the paper?',0,'pick up the paper 交代要拾起纸。'),
    pick('邻居说 “Thanks for your help.” 怎么回应最合适？','You’re welcome.|I’m eight.|I can’t see you.',0,'You’re welcome 用来回应感谢。'),
    listen('I can read stories to children. Ben can pick up litter in the park.','听录音。Ben 能帮什么忙？','在公园捡垃圾|给孩子读故事|给图书贴标签',0,'Ben 后面的 pick up litter 是给他的任务。'),
    write('深圳志愿者登记卡上，写一句你可以捡垃圾，再用一句邀请同学帮忙。','I can pick up litter. Can you help me, please?','两个句子分别说明自己的行动和礼貌请求。')]),
  upper('weather','天气、安排和建议','The weather and us','天气常用 It is ...。从天气和活动之间找关系。','It’s rainy. Take an umbrella.',[
    pick('“It’s cloudy.” 对应哪种天气？','多云|晴朗|下雪',0,'cloud 是云，cloudy 是多云的。'),
    pick('“It’s rainy, so let’s ___.” 哪个安排合适？','play inside|leave our umbrellas at home|go out without a coat in the rain',0,'下雨时 play inside 是可以直接实行的室内安排。'),
    listen('It will be sunny in the morning, but rainy in the afternoon.','听录音。哪个时段会下雨？','上午|下午|两个时段',1,'rainy 和 in the afternoon 连用。'),
    write('北京活动通知：天气有风。用两句英文说明天气，并建议带上外套。','It’s windy today. Take a jacket, please.','第一句描述天气，第二句给出符合场景的行动。')]),
  upper('seasons','季节、衣物和选择理由','Changing for the seasons','说季节时用 in spring 等搭配，说明选择可用 because。','I wear a coat in winter because it is cold.',[
    pick('哪组衣物更适合寒冷的冬天？','a T-shirt and shorts|a coat and warm gloves|a swimsuit and sandals',1,'coat 和 warm gloves 能帮助保暖。'),
    pick('“These gloves ___ mine.” 应填什么？','is|are|am',1,'gloves 是复数。'),
    listen('In autumn, I wear a light jacket. In winter, I wear a warm coat and gloves.','听录音。冬天说话人会穿什么？','薄夹克|厚外套和手套|短裤和凉鞋',1,'in winter 后面列出了 coat 和 gloves。'),
    write('上海四季展板请写两句英文，说明你夏天穿什么以及原因。','I wear a T-shirt in summer. It is hot then.','衣物和季节一致；给出一条简单原因。')]),
  upper('phonics','长短元音与拼读','声音和拼写','比较成对词的中间元音。常见的词尾 e 会使前一个元音变成长音。','cap 和 cape 的元音不同，cape 的末尾 e 不单独读音。',[
    pick('哪一个词和 make 的中间元音相同？','cake|map|bag',0,'make 和 cake 的 a 都发 /eɪ/。'),
    pick('哪组词的中间元音不同？','cap — cape|bike — kite|home — note',0,'cap 的 a 是短音，cape 的 a 发 /eɪ/。'),
    multi('看到“两只新的风筝”这条线索，哪些词来自英文标签 two new kites？','two|new|kites|cats',[0,1,2],'数词、形容词和名词依次对应。'),
    fill('广州手作展示用英文标注“便笺”。单词 n_te 缺哪个字母？','o','note 中间的字母是 o，和词尾 e 一起提示长元音。')]),
  upper('reading','读活动消息并写便签','读写综合','圈时间、地点、任务等信息，写便签时按收件人的需要排列。','Meet at the library at nine. 先说地点，再说时间。',[
    pick('“Meet at ten by the school gate.” 什么时间集合？','ten|school gate|today',0,'at ten 给出时刻。'),
    pick('通知说 “Bring a bag, not a box.” 哪件东西要带？','a bag|a box|a ruler',0,'not 否定 box，要求是 bag。'),
    multi('公告：“On Friday, meet by the park gate at 9:00. Bring water.” 哪些信息正确？','周五集合|在公园门口|带水|晚上九点开会',[0,1,2],'Friday、park gate 和 water 都有明确线索；公告没说晚上。'),
    write('深圳小组请用两句英文提醒伙伴，周六早上九点在公园门口集合，并带水。','Meet at the park gate at nine on Saturday morning. Bring water, please.','分别写清地点、时间和要带的东西。')]),
  lower('class-rules','课堂规则与祈使句','Class rules','肯定祈使句常用动词开头，禁止做某事用 Don’t + 动词原形。','Raise your hand. Don’t run in the hall.',[
    pick('哪条规则要求举手？','Raise your hand.|Run in the hall.|Close the door.',0,'raise your hand 是举手。'),
    pick('“Don’t ___ in the classroom.” 应填什么？','runs|run|running',1,'Don’t 后接动词原形。'),
    listen('Please speak quietly. Do not eat in the reading room.','听录音。阅读室里不允许做什么？','吃东西|轻声说话|看书',0,'Do not eat 表示不能吃东西。'),
    write('北京阅读室规则请写两个英文短句，提醒同学轻声说话、不要跑。','Speak quietly, please. Don’t run.','一条是正向指令，一条用 Don’t 禁止。')]),
  lower('family-rules','家庭规则与 can / must','Family rules','can 表示允许或能力，must 表示必须，mustn’t 表示禁止。','You must put away your books. 是必须收好书。',[
    pick('哪个词直接表达“必须”？','can|must|may',1,'must 表达规则或义务。'),
    pick('“You mustn’t ___ on the wet floor.” 哪个选项正确？','run|ran|running',0,'mustn’t 后用动词原形。'),
    listen('You can watch TV after dinner, but you must finish your homework first.','听录音。看电视前必须先做什么？','完成作业|洗衣服|扫地',0,'must ... first 说明作业必须先做。'),
    write('上海家庭规则卡写两句英文：必须收好玩具，可以在晚饭后阅读。','You must put away your toys. You can read after dinner.','区分义务和许可；after dinner 交代时间。')]),
  lower('school-time','作息、钟点和活动安排','Time for school','用 What time ...? 问时间，用 at 表示某个时刻。','I get to school at eight o’clock.',[
    pick('Which answer tells the time?','At seven thirty.|In the kitchen.|I have a book.',0,'at seven thirty 回答几点。'),
    pick('“It’s time ___ lunch.” 填什么？','on|for|under',1,'It’s time for + 名词表示到……时间了。'),
    listen('We have English at nine, and music at ten thirty. Lunch is at twelve.','听录音。音乐课什么时候开始？','9:00|10:30|12:00',1,'music 后紧跟 at ten thirty。'),
    write('广州校园时间表请写两句英文，说明八点到校，十二点吃午饭。','I get to school at eight. I have lunch at twelve.','每句话写活动和钟点，用 at 接时刻。')]),
  lower('shopping','购物对话、价格和试穿','Going shopping','用 How much 问价格，is 和 are 由商品单复数决定。','How much are these shoes? — They’re sixty yuan.',[
    pick('问一件夹克的价格，应该说哪句？','How much is this jacket?|How many jackets are there?|What colour is it?',0,'How much is 用来问单件价格。'),
    pick('“How much ___ these shoes?” 填什么？','is|are|am',1,'these shoes 对应 are。'),
    listen('The red hat is thirty yuan. The blue hat is twenty-five yuan.','听录音。蓝色帽子多少钱？','25 元|30 元|55 元',0,'先定位 blue hat，再听 twenty-five。'),
    write('深圳义卖请写两句英文对话，问这顶帽子的价格，并答 28 元。','How much is this hat? It’s twenty-eight yuan.','问单件物品用 is，答句给出价格和单位。')]),
  lower('farm','农场动植物、单复数和指认','Farms and us','问近处多件东西用 What are these?。注意常见动物复数。','What are those? — They’re sheep. sheep 单复数同形。',[
    pick('Which word can mean more than one sheep?','sheeps|sheep|a sheep',1,'sheep 的复数形式仍是 sheep。'),
    pick('“What are those?” 问远处多件东西，怎么回答最合适？','They’re carrots.|It’s a carrot.|It is those.',0,'those、They’re 和 carrots 都对应复数。'),
    listen('These are green beans. Those are tomatoes, right next to the carrots.','听录音。靠着胡萝卜的是什么？','西红柿|四季豆|土豆',0,'tomatoes 和 next to the carrots 属于同一句。'),
    write('北京农场导览用英文写两句话，说明近处是胡萝卜，远处是羊。','These are carrots. Those are sheep.','These 指近处，those 指远处；两句都用 are。')]),
  lower('food-chain','食物从农场到餐桌','From farm to table','抓顺序词 first、then、finally，用英语说清步骤和结果。','First we wash the vegetables. Then we cut them.',[
    pick('First, wash the apples. Then, cut them. 哪一步先做？','洗苹果|切苹果|吃苹果',0,'first 放在洗苹果的动作前面。'),
    pick('哪组顺序词适合说明三个步骤？','First, then, finally.|Red, big, green.|Under, on, in.',0,'前一组词分别提示开始、中间和结束。'),
    listen('We pick the tomatoes first. Then we wash them. Finally, we put them in a salad.','听录音。摘下西红柿后紧接着做什么？','清洗|做成沙拉|种下种子',0,'then 承接 first，后面的 wash 是第二步。'),
    write('上海小组要做水果沙拉。用两句英文写“先洗苹果，再切苹果”。','First, wash the apples. Then cut them.','顺序词清楚，them 指前一句的 apples。')]),
  lower('phonics','元音字母组合与单词辨音','声音和拼写','关注相同的元音字母组合，同时注意同一种拼法也可能有不同读音。','rain 与 train 的 ai 都发 /eɪ/。',[
    pick('哪一组单词的 ai 发音相同？','rain — train|rain — said|train — said',0,'rain、train 的 ai 都发 /eɪ/。'),
    pick('哪一个词与 sheep 的 ee 读音相同？','green|bread|head',0,'sheep、green 的 ee 都发 /iː/。'),
    multi('哪些词含有与 boat 相同的 oa 字母组合？','coat|goat|book|rain',[0,1],'coat、goat 与 boat 有相同的 oa 组合。'),
    fill('广州农场卡片画一只山羊。英文标签 g__t 缺哪两个字母？','oa','goat 用 oa 表示 /əʊ/ 或 /oʊ/。')]),
  lower('reading','读懂价签、时间表和流程卡','读写综合','先看问题找信息类型，再联系行列、图例或顺序词。','“¥8 each”是单价；“Starts at 10:00”是开始时间。',[
    pick('卡片写 “Class starts at 8:40.” 哪个是开始时间？','8:40|8:04|4:08',0,'at 后列出开始时刻。'),
    pick('价签 “Six yuan each.” 的 each 指什么？','每件|一共|每班',0,'each 表示每一个。'),
    multi('通知：“Farm visit: Saturday, 9:15. Meet at the school gate. Bring a hat, please.” 哪些信息正确？','周六 9:15|学校门口集合|带帽子|周日参观',[0,1,2],'Saturday、school gate 和 hat 分别给出三条信息。'),
    write('深圳农场参观便签请用两句英文提醒朋友，周日十点在校门口集合，请带水。','Meet at the school gate at ten on Sunday. Please bring water.','写清时、地和物品，注意 Sunday 首字母大写。')])
];

const size = 8;
const group = (title, make) => [title,Array.from({length:size},(_,i)=>make(i))];
const drill = (book,id,title,category,lesson,groups) => ({
  ...topic(book,`calc-${id}`,title,category,lesson,'',groups.flatMap(([,questions])=>questions)),
  drill:{size,category,sets:groups.map(([name])=>name)}
});
const numeric = (ask, answer, why) => fill(ask,answer,why,'numeric');
function product(a,b) {
  const tens=b-b%10, ones=b%10;
  return numeric(`${a} × ${b} 等于多少？`,a*b,`${a}×${tens}＝${a*tens}${ones ? `，${a}×${ones}＝${a*ones}` : ''}，相加得 ${a*b}。`);
}
function division(divisor, quotient, remainder = 0, askRemainder = false) {
  const total = divisor*quotient+remainder;
  return numeric(`${total} ÷ ${divisor}，${askRemainder ? '余数是多少？' : '整数商是多少？'}`,
    askRemainder ? remainder : quotient,`${divisor}×${quotient}＋${remainder}＝${total}，因此商 ${quotient}、余 ${remainder}。`);
}
function decimal(a,b,subtract) {
  const op=subtract?'−':'+', answer=subtract?a-b:a+b;
  const dec=value=>(value/100).toFixed(2);
  const accepted=[...new Set([dec(answer),String(answer/100),dec(answer)+'0'])];
  return fill(`${dec(a)} ${op} ${dec(b)} 等于多少？`,accepted.join('|'),
    `对齐小数点后计算。也可把它们看成百分之一：${a}${op}${b}＝${answer}，所以结果是 ${dec(answer)}。`,'decimal');
}

const drills = [
  drill('g4a','products','多位数乘两位数','笔算与口算','先乘个位，再乘十位；第二层积从十位开始写。',[
    group('整十和接近整十的乘数',i=>product(127+i*14,20+i*10)),
    group('三位数乘两位数',i=>product(126+i*31,23+i*3)),
    group('含零的四位数乘两位数',i=>product(1007+i*101,14+i*2))
  ]),
  drill('g4a','rounding','大数、换算与近似数','估算与数位','按四位一级判断万级；求近似数时看指定数位的右边一位。',[
    group('用数字写“几万另几”',i=>{
      const a=21+i*15,b=12+i*105;
      return numeric(`把 ${a} 万另 ${b} 写成一个整数。`,a*10000+b,`万级放 ${a}，个级写 ${String(b).padStart(4,'0')}。`);
    }),
    group('四舍五入到万位',i=>{
      const value=108070+i*16584;
      return numeric(`${value} 四舍五入到万位，约多少万？`,Math.round(value/1e4),`千位是 ${Math.floor(value/1000)%10}，满 5 进一，不满 5 舍去。`);
    }),
    group('用估算检验支出',i=>{
      const goods=24+i*10, price=18+i*3, a=Math.ceil(goods/10)*10,b=Math.ceil(price/10)*10;
      return numeric(`${goods} 件商品，每件 ${price} 元。把数量看成 ${a}、单价看成 ${b}，估算总价为多少元？`,a*b,`两个数都估大，${a}×${b}＝${a*b}。`);
    })
  ]),
  drill('g4a','breakdown','拆数口算与验算','笔算与口算','把乘数拆成整十和个位，也可用接近的整十先算再调整。',[
    group('先算乘整十再补',i=>{
      const a=74+i*12,b=30+i%4*10,c=2+i%5;
      return numeric(`用“乘整十再补”算 ${a} × ${b+c}。`,a*(b+c),`${a}×${b}＋${a}×${c}＝${a*b}＋${a*c}。`);
    }),
    group('先乘一个好算的整十再减',i=>{
      const a=81+i*9,b=40+i%4*10,c=1+i%3;
      return numeric(`先把 ${b-c} 看成 ${b} 再调整，算 ${a} × ${b-c}。`,a*(b-c),`先算 ${a*b}，再减去多算的 ${a*c}。`);
    }),
    group('用积的变化规律口算',i=>{
      const a=35+i*12,b=16+i*2;
      return numeric(`已知 ${a}×${b}＝${a*b}。求 ${a*10}×${b}。`,a*b*10,'一个因数乘 10，另一个不变，积也乘 10。');
    })
  ]),
  drill('g4a','models','单位对应与数量关系','数量关系','对齐单位，再用每份量×份数求总量。',[
    group('单价与总价',i=>{
      const price=12+i*3,count=23+i*2;
      return numeric(`单价 ${price} 元，一次买 ${count} 件，总价多少元？`,price*count,`${price}×${count}＝${price*count}。`);
    }),
    group('速度与路程',i=>{
      const speed=46+i*3,duration=16+i;
      return numeric(`每分钟走 ${speed} 米，走 ${duration} 分钟，共走多少米？`,speed*duration,`速度×时间＝路程，即 ${speed}×${duration}。`);
    }),
    group('相同分组外有单独的数量',i=>{
      const a=41+i*3,b=16+i*2,c=11+i*5;
      return numeric(`${b} 组各交 ${a} 张作品，另收到 ${c} 张。合计多少张？`,a*b+c,`先算分组的 ${a*b} 张，再加 ${c} 张。`);
    })
  ]),
  drill('g4b','division','两位数除法试商与验算','除法','用相近的整十试商，再调商。余数小于除数。',[
    group('除以整十数',i=>division(20+i*10,12+i*4)),
    group('两位数试商',i=>division(17+i*4,15+i*3,i+2)),
    group('求余数',i=>division(21+i*3,31+i*5,3+i*2,true))
  ]),
  drill('g4b','mixed','四则运算与括号','四则运算','先做括号，再乘除，最后加减。同级从左往右。',[
    group('含乘法和加法',i=>{
      const a=138+i*17,b=11+i,c=12+i*2;
      return numeric(`${a} + ${b} × ${c} 等于多少？`,a+b*c,`先算乘法 ${b*c}，再加 ${a}。`);
    }),
    group('括号和除法',i=>{
      const a=32+i*11,b=12+i;
      return numeric(`(${a*b+50} − 50) ÷ ${b} 等于多少？`,a,`先算括号 ${a*b}，再除以 ${b}。`);
    }),
    group('乘除同级按先后',i=>{
      const d=12+i,q=25+i*3,m=3+i;
      return numeric(`${d*q} ÷ ${d} × ${m} 等于多少？`,q*m,`先除得 ${q}，再乘 ${m}。`);
    })
  ]),
  drill('g4b','laws','运算定律与简便计算','简便运算','先找能凑整的因数或共同乘数，再选择合适的运算定律。',[
    group('凑一百或一千',i=>{
      const a=i%2?125:25,b=17+i*5,c=i%2?8:4;
      return numeric(`${a} × ${b} × ${c} 等于多少？`,a*b*c,`交换位置先算 ${a}×${c}＝${a*c}，再乘 ${b}。`);
    }),
    group('提取共同的乘数',i=>{
      const a=27+i*3,b=100-a,c=16+i*7;
      return numeric(`${a} × ${c} + ${b} × ${c} 等于多少？`,100*c,`提取共同乘数 ${c}，(${a}＋${b})×${c}＝100×${c}。`);
    }),
    group('把 99 或 101 看成整百加减 1',i=>{
      const a=29+i*5,b=i%2?101:99;
      return numeric(`${a} × ${b} 等于多少？`,a*b,`先算 ${a}×100＝${100*a}，再${i%2?'加':'减'}一个 ${a}。`);
    })
  ]),
  drill('g4b','decimals','小数加减与凑整','小数加减','小数点对齐。两个数可凑整时，可调整加减的顺序。',[
    group('小数加法进位',i=>decimal(386+i*83,257+i*22,false)),
    group('小数减法退位',i=>decimal(1031+i*106,275+i*21,true)),
    group('两笔和第三笔小数金额',i=>{
      const a=975+i*100,b=125+i*25,c=265+i*10,val=a+b-c;
      const money=x=>(x/100).toFixed(2);
      return fill(`买书两次花 ${money(a)} 元和 ${money(b)} 元，减去优惠 ${money(c)} 元，实付多少元？`,
        [...new Set([money(val),String(val/100)])].join('|'),`先相加为 ${money(a+b)} 元，再减 ${money(c)} 元。`,'decimal');
    })
  ])
];

const transcripts = Object.fromEntries(english.flatMap(item=>item.questions.flatMap((q,index)=>q.audio?[[`${item.id}-${index+1}`,q.audio]]:[])));
if (process.argv[2] === '--transcripts') {
  console.log(JSON.stringify(transcripts));
  process.exit(0);
}

const additions = {cn:chinese,math:[...mathematics,...drills],en:english};
const books = new Set(['g4a','g4b']);
const perBook = book => Object.values(additions).flat().filter(item=>item.book===book);
for (const book of books) {
  const topics=perBook(book), core=topics.filter(item=>!item.drill);
  assert.equal(core.length,24,book);
  for (const item of core) {
    assert.equal(item.questions.length,4,item.id);
    assert.equal(cityBank[item.id].length,32,item.id);
  }
  const calculations=topics.filter(item=>item.drill).flatMap(item=>item.questions);
  assert.equal(calculations.length,96,book);
  assert.equal(new Set(calculations.map(q=>q.ask)).size,96,book);
}

const htmlPath = path.join(__dirname,'..','index.html');
const html = fs.readFileSync(htmlPath,'utf8');
const region = /(<script id="question-bank" type="application\/json">)([\s\S]*?)(<\/script>)/;
const match = html.match(region);
assert.ok(match,'Question bank not found.');
const bank = JSON.parse(match[2]);
for (const [subject,items] of Object.entries(additions)) {
  bank[subject] = [...bank[subject].filter(item=>!books.has(item.book)),...items];
}
const topics = Object.values(bank).flat();
assert.equal(new Set(topics.map(item=>item.id)).size,topics.length,'Duplicate topic ID.');
const json = JSON.stringify(bank,null,2).replaceAll('<','\\u003c');
let output = html.replace(region,(_,start,previous,end)=>`${start}\n${json}\n${end}`);
if (process.argv[2]) {
  const tracks = JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
  assert.deepEqual(Object.keys(tracks).sort(),Object.keys(transcripts).sort(),'Missing or unexpected fourth grade audio.');
  const audioRegion = /const audioTracks = (\{[^\r\n]*\});/;
  assert.ok(output.match(audioRegion),'Audio track list not found.');
  output = output.replace(audioRegion,(_,previous)=>`const audioTracks = ${JSON.stringify({...JSON.parse(previous),...tracks})};`);
}
if (output !== html) fs.writeFileSync(htmlPath,output);
for (const book of books) {
  console.log(`${book}: 192 core and drill questions, 768 city questions.`);
}
