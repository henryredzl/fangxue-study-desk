'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pick = (ask, choices, answer, why, extra = {}) => ({type:'pick',ask,choices:choices.split('|'),answer,why,...extra});
const multi = (ask, choices, answer, why) => ({type:'multi',ask,choices:choices.split('|'),answer,why});
const order = (ask, choices, answer, why) => ({type:'order',ask,choices:choices.split('|'),answer,why});
const write = (ask, answer, why) => ({type:'write',ask,answer,why});
const fill = (ask, answer, why, inputMode = 'numeric') => ({type:'fill',ask,answer:String(answer).split('|'),why,inputMode});
const listen = (audio, ask, choices, answer, why) => pick(ask,choices,answer,why,{audio});
const label = (book,id,title,unit,lesson,example) => ({book,id:`${book}-${id}`,title,unit,lesson,example});
const textTopic = (book,id,title,unit,lesson,example,rows,application,material) => ({
  ...label(book,id,title,unit,lesson,example),
  cards:rows.trim().split('\n').map(row=>row.trim()),
  application,material
});
const upper = (...args) => textTopic('g5a',...args);
const lower = (...args) => textTopic('g5b',...args);

const chinese = [
  upper('objects','借具体事物抒发感情','万物有情','从物的形态、变化和人与它的相处找线索，解释它为什么让作者产生某种感情。','写旧书包的磨痕，可以联想到每天陪伴自己的记忆。',`
“我小心抚平标本边缘，夹回那本旧书。”最能看出作者怎样对待标本？|珍惜|厌烦|“小心”和“夹回”表示愿意保护它。
“梅花在雪里依旧开着。”若借梅花赞扬品质，哪项贴切？|困难中坚持|喜欢热闹|“在雪里依旧开”能联系到困难并未让它停下。
祖父做的小木凳掉了漆，“我舍不得换掉”。为什么旧得掉漆还重要？|它承载祖父陪伴的记忆|作者只喜欢掉漆物品|“祖父做的”提示珍惜来自亲情。
写感激邻居，哪句能借灯光表达感情？|那盏总在雨夜为我留着的小灯，照亮了回家的最后几步。|楼道换了一颗新灯泡。|“总”“为我留着”把灯光和邻居长期的关照连起来。
`,write('用三句话介绍一件你舍不得丢的旧物。写一个可见细节和一段与它有关的回忆。','木尺边上有一道小缺口。小时候祖母就在这个缺口旁画下我的第一条直线。我如今还用这把尺，偶尔摸摸那道缺口。','外形细节服务于回忆，回忆解释了为什么珍惜。')),
  upper('fast-reading','带着问题提高阅读效率','阅读策略','先看阅读任务，再成组读词语、抓关键词。遇到不影响理解的词，可以暂时跳过。','查活动地点时先扫标题、地名和地点变更说明。',`
想快速查到活动集合处，先找哪类线索？|地点词、方位词|所有形容词|地点能直接回答“在哪儿”。
遇到不懂的枝叶名称，但只需找到植物开放日期，怎么读更省时？|先跳过名称，定位日期|停下把每个字查完|当前任务是查日期，可先解与任务有关的信息。
通知先说周三开放，末句补充“下雨改周五”。要判断雨天安排，哪句最重要？|下雨改周五|周三开放|题目给出下雨条件，必须读到例外说明。
快速读完后要验证概括，优先读哪里？|能支持主旨的句子和转折后信息|每个逗号读一遍|转折常改变主要观点，关键句能验证概括。
`,write('展馆公告说“通常周三开放。本周设备维护，开放日改为周五，来宾请走东门”。请写出快速找到本周参观安排的步骤和结果。','先找“本周”和“改为”，确定周五开放。再找门的方位，来宾从东门进入。','核对时间变更和入口，说明凭哪些词找到。')),
  upper('folktales','民间故事的创造性复述','民间故事','保持人物、主线和因果，允许换角色视角，或补上合理的动作与对话。','把第三人称改成角色自述时，已发生的情节仍按原顺序。',`
改成渔夫自述，哪个开头视角准确？|我在岸边收网，发现网里有一块会发光的石头。|他听说我一直未到岸边。|由渔夫本人说亲历事情，用第一人称。
原故事靠机智脱困，复述时哪种改动不合适？|删掉破解困局的办法|补一句符合人物的对话|关键办法推动结局，删去会破坏因果。
守桥人答应履约就让行。角色跨桥前补哪段合理？|他们完成约定并向守桥人说明。|大家忘了约定却无故过桥。|履约是获得通行的条件。
想让口头复述更有画面，保留讲什么，再详细写哪里？|保留情节主线，详讲关键动作|保留每一个颜色词，删掉结局|关键动作有助于听明白，结局是主线的一环。
`,write('原故事：村民发现水井枯了，少年借月光找到泉眼，大家修渠引水。请用少年自述的方式复述，并补一处合理细节。','我到井边时，看见井底干得裂了缝。晚上我跟着月光照出的湿痕，找到坡后的泉眼。第二天我带村民来修水渠，泉水终于流回村口。','视角一致，原故事三环节完整，细节前后说得通。'),
  order('把民间故事的主干排清楚。','清泉顺着水渠进了村。|村口的古井已经见底。|少年找到泉眼，大家赶来修渠。',[1,2,0],'井枯是起因，找泉修渠是经过，引水回村是结果。')),
  upper('history','结合资料理解文章情感','家国情怀','先理解文中的具体词句，再借必要的背景解释作者为何这样写。资料应与原文证据相互对应。','读到“终于望见归船”，可以借长期在外的背景体会希望。',`
一位离乡多年的诗人写“故园灯火何时见”。哪个背景更能帮助理解？|他已在外多年难以回家|他字写得工整|长期难归能解释“何时见”的思念。
“清点名册，他连夜逐家通知停课。”评价人物负责，哪处是直接依据？|连夜逐家通知|季节是初秋|“连夜”“逐家”写亲自尽责。
资料说一座桥经历灾后重修；文中说“再一次踏上它，脚步比平时慢”。怎样理解更合理？|重踏旧桥有珍惜和感慨|作者一定怕桥会立刻倒|“再一次”与重建背景能支持珍惜。
读抗洪志愿者的记录，写感想优先选什么作证？|记录中的行动和结果|跟主题无关的年代数字|感想应有具体行为或事实支撑。
`,write('材料写老师洪水退后把课桌一张张搬回教室。写两句，结合背景表达你对老师行为的理解。','水退了，教室还需要重新整理，复课并不轻松。老师一张张搬回课桌，是想让孩子们尽早有地方上课。','先交代背景，再用动作说明判断。')),
  upper('explain','说明方法与准确表达','说明性文章','辨别列数字、作比较、举例子、打比方的作用。限定词说明范围或程度。','“约 8 毫米”表明这是近似值，体现说明的准确性。',`
“新袋约能装 12 本练习册。”用了什么方法？|列数字|打比方|用数量描述容量，“约”表明不是精确上限。
把“多数幼苗两天内出芽”改成“幼苗两天内都出芽”，哪处失真？|适用范围扩大了|时间缩短了|“多数”只说大部分，“都”变成全部。
“甲纸 1 分钟吸水 8 毫升，乙纸吸 5 毫升。”材料说明谁吸得更多？|甲纸|乙纸|同样 1 分钟用相同单位比较，8 大于 5。
给学校做饮水机展签，哪句更容易核实？|水箱可装 10 升水。|它能装多得数不清的水。|具体数字和单位可以测量。
`,write('给一个熟悉的小物品写三句说明。至少用一种说明方法，并尽量准确。','我的水壶能装约 500 毫升水。和同桌 350 毫升的杯子相比，它能多装大约 150 毫升。壶口能拧紧，放进包里时要确认盖子已经合上。','数据有单位，比较对象明确，近似数字有恰当限定。')),
  upper('parent','从细节体会场景中的感情','父母与成长','把人物动作、话语和环境放回同一场景，找它们怎样表现关心或体谅。','母亲一边赶工，一边把饭盒重新捂热，动作表现关心。',`
父亲在冷风里把伞一直往女儿那边推，自己肩上湿了。最能体会什么？|对子女的照顾|不愿意回家|推伞和肩湿两个细节合起来表现照顾。
“快走吧”单独读很短。前面写父亲把热饭塞到孩子手里，读这句应怎样理解？|赶时间中仍关心孩子|只是生孩子的气|联系塞热饭的行动，语气更有依据。
少年错过末班车，奶奶在路口来回踱步。哪个细节写担心？|来回踱步|公交车是蓝色|反复走动体现急切等待。
要写感谢家人，哪句更能让读者感到情意？|我把那张她帮我补好的笔记夹在最常翻的那页。|家里人的姓名有三个字。|对物品的珍藏体现感情，而不是只描述外在信息。
`,write('写两三句话表现家人在一个小场景中的关心，尽量用动作或对话。','我写作业写到很晚。爷爷把书桌灯往旁边移了半寸，又把温水放到我伸手够得到的地方，只说：“慢慢写。”','动作和话语应能让读者感到同一种情意。')),
  upper('landscape','动态与静态描写','四季景物','选一个观察位置，分清景物本来呈现的状态和发生的动作变化。结合场景选择详略。','湖面平整是静态，一群水鸟掠过是动态。',`
“远山一动不动，薄云从山腰慢慢掠过。”哪项是动态？|薄云掠过|远山不动|“掠过”表示位置在变化。
写静谧的清晨，哪句是静态描写？|玻璃一样平的湖面映着树影。|一群雀鸟跳上枝尖。|水面、倒影的状态在此刻保持稳定。
“风停了，渡船靠岸后不再摇晃。”写了什么变化？|由动转静|由暗转明|停风和不再摇都是动作结束的线索。
给晚景片段补一个动态细节，哪句合适？|一只鸟掠过河面，水纹立刻散开。|河对岸有一幢灰色房子。|“掠过”“散开”写出连续动作。
`,write('写一处傍晚景物，先写一个静态画面，再写一个动态变化。','远处的屋脊安静地伏在淡紫色天空下。一队鸟从树林里飞起，像一串移动的黑点，从屋脊上方掠过去。','前一句给整体状态，后一句写相同场景里的动作。')),
  upper('recommend','读书推荐与用理由支持观点','阅读与表达','说清推荐给谁、书怎样吸引人，再选一两个具体例子说明理由。','推荐一本冒险故事，可以举一次关键选择如何推动情节作证。',`
推荐理由“很好看”怎样改得更有用？|写出主角如何用地图解开迷路难题|把“很好看”抄三遍|具体情节能帮助读者判断是否想读。
要向喜欢科学的同学推荐，首先应考虑什么？|书里的科学现象和读者的兴趣是否相关|封面颜色是否是同一种|推荐要和听众的需求贴合。
推荐卡列“有图表、步骤短、可以跟着做”。它主要支持哪条评价？|这本书适合动手跟做|书里一定有文学大奖|图表和步骤能指导实践。
想降低剧透，怎样举例最合适？|点出关键难题，保留最后结果|把结局和所有情节写全|用未解决的难题激发兴趣，同时保留悬念。
`,write('为同学写一张简短的读书推荐卡。用一个具体细节说明推荐理由，可写自己熟悉的书。','推荐《森林观察页》给爱做记录的同学。书中教你在固定时间画下树影，再用方格比较长度；这个步骤放学后也可以自己试。','交代对象、书名和可核对的推荐理由。')),
  lower('childhood','体会童年故事的感情','童年生活','抓想做什么、怎样做和当时感受，从具体词语体会回忆中的快乐、遗憾或不舍。','“一再回头看木马”比只说喜欢更容易表现舍不得。',`
“收好陀螺后，我又偷偷把它转了一圈。”最能表现什么？|意犹未尽|讨厌这个游戏|明明收好了还想继续转。
“窄窄的田埂在那时像一条长长的赛道。”怎样理解？|童年的想象使平常田埂变得有趣|田埂实际是体育场|“像”是从孩子感受出发的比喻。
“搬家前我把纸船摸了好几次，却没再放进水里。”哪个感受更有依据？|留恋、不舍|完全不在乎|反复摸旧物的动作暗示留恋。
写快乐的童年劳动，哪个细节切题？|我偷笑着掏出土里的第一只红薯。|农具的购买发票编号是 57。|动作和神态表现得到了劳动成果的快乐。
`,write('用三句话回忆一次有意思的童年活动。写一个动作，让读者体会你当时的感受。','我把纸飞机举过头顶，用力往前送。它没有直直落下，反而贴着花坛飞过了两个弯。我追得鞋带都散了，还一直笑。','动作具体，感受能从行为里读出来。')),
  lower('classics','联系上下文读古典名著','走近古典名著','遇到不熟悉的词，先看人物、动作和前后结果；影响主线时再查资料核对。','“店家筛了酒”可从端来酒碗的动作推知是斟酒。',`
“此人不识水性，落水便呼救。”水性在这里指什么？|游水的能力|河水的颜色|落水呼救说明不会游水。
“客官且在此歇息，待我去取草料。”且在这里是什么含义？|暂且|并且|“待我去”表明先在此等候片刻。
“半晌不见回信，他自行向门外打听。”半晌怎样理解？|过了好一会儿|只是一眨眼|等不到回信才主动打听，表明经过一段时间。
想根据一段名著故事评价人物，哪种证据更可靠？|找同一人物在情节中的语言与行动|只看现代影视改编的服装颜色|原文情节更直接支持判断。
`,write('短段：“那汉子欲渡河，见水势甚急，便立于岸边等候。”先把意思用现代汉语写出来，再说你怎样理解“甚急”。','那个人想过河，看到水流十分湍急，就站在岸边等着。“甚急”从“水势”和他选择不立刻下水可以推知。','改写应保留人物、原因和行动，并指出上下文线索。')),
  lower('characters','写具体的人物特点','人物描写','选择最能代表特点的一件事，写可观察的语言、动作和神态。也可用他人的反应侧面表现。','乐于助人可以写同学怎样逐步教别人完成任务。',`
“她把每个小袋贴上名字，再挨个核对重量。”什么特点最贴切？|细致认真|健忘|逐一标记、核对是认真细致的直接证据。
哪句是用旁人反应表现小凯会讲故事？|听完后大家还凑在他身边，问下一段什么时候讲。|他穿着一双运动鞋。|听众的聚拢和追问是侧面证据。
“我再慢一点，你自己试试。”她说完将尺移近对方。最像什么特点？|耐心|急躁|她调整节奏、让同伴有机会练习。
写“朋友善于坚持”，在几件事里选什么最有代表性？|修模型多次失败后每次找原因再试|一次在门口打招呼|反复修正并再试符合坚持。
`,write('用三句话写出一个人的“有办法”。安排一处语言和一个动作。','轮子老是卡住，小禾说：“先转慢一点，看看它在碰哪里。”他用彩笔给卡住的位置做了记号，再把旁边的纸片往外挪。轮子这次轻松转了起来。','特点由语言、行动和结果共同说明。')),
  lower('feeling','从动作、语言、神态体会内心','责任与成长','把人物在压力下的语言、动作与前后选择联系起来，提出有文本证据的感受。','“手心冒汗仍上台”提示紧张和继续承担任务可以同时存在。',`
“他抿紧嘴唇，把歪掉的尺重新放到刻度线上。”最能表现什么？|专注并下决心做准|不想再做|重新对准说明想把事情做准。
小健发言时声音很轻，却一直捧着名单逐项念完。怎样理解较合理？|有些紧张但坚持完成任务|对名单毫不关心|“很轻”与“逐项念完”表现两面。
发错卡片后，阿琳当场说“是我记错了，我按编号重发”，哪项评价有依据？|主动承担并纠正|故意躲避|她承认原因并提出重发办法。
“他看见从前帮过自己的同伴，也拉了一下旁边落单的孩子。”最能体会哪种变化？|从得到照顾到主动关照别人|学会了跑得更快|前后行为形成照顾关系的转变。
`,write('写一个人差点放弃但最后坚持下来的场景。用动作或一句话表现内心变化。','我把练了一半的稿纸揉了一下，几乎想塞进书包。看见朋友指着我已经清楚的一段，我把稿纸重新展开，低声说：“那我从下一段再来。”','既写出差点放弃，也写出继续尝试的依据。')),
  lower('research','筛选材料并写简短研究报告','综合性学习','先确定问题，注明可核对的来源。比较记录后用证据支持结论，也说明适用范围。','对班级阅读调查，结论要标明仅根据本班的有效问卷。',`
要查校图书角上月借阅数，优先用哪份资料？|对应日期的借阅登记表|走廊的海报颜色|登记表与问题直接相关，也可以核对。
调查仅问了五年级一班，哪个结论合理？|这份数据反映五年级一班被调查同学的偏好。|全市小学都更喜欢这类书。|样本只覆盖一个班，结论范围也应限制。
两张表一个写“人次”，另一个写“人数”。并列说明前要做什么？|核对统计口径后再比较|把它们当同一单位直接相加|同一人可产生多次人次，概念不同。
研究“哪些时间到校门口更拥挤”，哪项资料有用？|同一工作日各时间段的通过人数|未注明日期的花坛照片|与目标变量一致的分时记录能支持判断。
`,write('班级收回 30 张有效问卷，18 人选纸质书，12 人选电子书。写一条研究结论并提醒读者结论的适用范围。','本班收回的 30 张有效问卷中，选择纸质书的同学有 18 人，比选择电子书的多 6 人。结论只反映本次作答同学的选择。','写清有效样本和数字，再说明结论适用范围。')),
  lower('thinking','理清思维过程与解决问题的方法','思维的火花','比较条件和限制，按“发现问题—分析—调整—验证”的次序复述思路。','首选路线有积水，改走不积水的支路后检查时长。',`
竞赛有三场，同等实力只能赢一场。想按规则换出场次序，先查什么？|两方每组的长处与规则允许的调整|给队伍换一个名字|了解条件和规则后才能设计新顺序。
模型掉下是底盘太窄。只改一个地方测试，优先改哪里？|加宽底盘|更换展示牌颜色|底盘宽度与已判断的原因有关。
记录“先列三条路线，删去超时一条，再比较成本”，哪一步简化选择？|删去超时路线|先画标题|用时间限制排除不可行候选。
同伴提出“更快”方案，怎样验证？|用同一任务与原方案各做一次并计时|只问谁更喜欢方案名称|保持任务相同便于比较结果。
`,write('班级要搬 60 本书。方案甲每次搬 10 本，乙每次搬 15 本。请写下你选择方案的过程和一个要核实的条件。','若两种方案都能安全搬运且每趟时间相同，甲要 6 趟，乙要 4 趟，我选乙。还要确认负责搬书的同学一次能安全拿 15 本。','用同一目标比较，并指出可能改变选择的条件。'),
  order('把思考过程按先后排序。','试用新办法查看有没有解决问题。|找出最可能的卡点和限制。|根据原因选一个可以调整的地方。',[1,2,0],'先分析，再设计调整，再检验。')),
  lower('features','从描写体会景物独特之处','异域风情','找能区分这处环境的细节，再按地形、时间或感官分层组织说明。','用石桥的弧形和水面反光，说明它区别于直桥的地方。',`
介绍“很安静的水巷”，哪个细节比“这里真美”更具体？|靠岸的船轻轻碰着石阶，只发出闷闷一响。|这处景色好看得很。|船靠岸的具体声响能衬托静。
“窗子越到上层越小。”这句主要说明什么？|建筑的外形特点|旅游门票多少钱|上层和下层的窗子形成可见比较。
游记先沿河看桥，再入巷看铺，最后登台俯瞰。它是什么顺序？|游览路线|按人物年龄|地点随着脚步发生变化。
向第一次来访者介绍一处巷子，哪项最能说清它的独特性？|店门贴着水面，常从小船上接货。|有很多不同东西。|临水交货是可辨认的地方生活特点。
`,write('介绍你熟悉的一处建筑或景物。从形状、声音或活动中选两个方面写出它的特点。','老桥的桥身弯得像半圆，桥下能容一艘小船慢慢划过。早上两岸有人隔水问候，声音从拱洞里轻轻绕回来。','两个方面互补，读者能辨认这处景物。')),
  lower('humor','理解幽默语言与言外之意','风趣的语言','把字面意思放回对话场景，结合夸张、双关或出乎意料的回应体会说话人的用意。','排了很久的队说“我都快长成路牌了”，是夸张等待很久。',`
搬教具回来后，朋友说“我走了一个世纪”。他实际想说什么？|走了很久|真的过去了一百年|明显不可能的时长是夸张。
“这是你的错题本？”他看见页上全写着正确答案，接着笑说“它今天转行了”。转行指什么？|错题本暂时变成了展示正确解法的本子|同学改做了售货员|笑话把本子的用途变化说成换职业。
对方说“这个工具真轻，我一拿就险些站不稳。”结合语境，最可能是什么意思？|工具比预想的重|工具完全没有重量|后半句实际反应与“真轻”形成反话。
评价同伴的小失误时，怎样幽默又不伤人？|针对小事轻松开玩笑，并给个可行办法|拿同伴的外貌取笑|围绕事情、表达理解，能减少对人的冒犯。
`,write('用一句温和的夸张写“等公交很久”，再用一句话说明真实意思。','我在站牌旁等得仿佛能看完一整部电影。意思是公交车来得比平时晚，我等了很久。','夸张易懂，不以取笑他人为代价。'))
];

const english = [
  upper('friends','描述并比较朋友','Different friends','区别 be 后的特点、has 后的特征和 like 后的喜好。比较两人可用 both 或 but。','They are both kind, but Sam is quieter.',`
“What is Leo like?” Which answer describes his character?|He is helpful.|He likes rice.|问 is ... like 补特点；likes 表示喜好。
“Mina and Tao both enjoy drawing.” Who enjoys drawing?|Both Mina and Tao.|Only Mina.|both 指两人都如此。
“Ben is quiet, but his friend is very talkative.” Which word describes Ben?|quiet|talkative|but 连接的是两个人不同的特点。
Which sentence describes two friends clearly?|Ana is friendly, and Mei is patient.|Ana and Mei are patience.|friendly 和 patient 是可放在 be 后的形容词。
`,write('用两句英文介绍两位朋友。先写一个共同点，再写一个不同点。','Mia and Lin both like reading. Mia is quiet, but Lin loves telling stories.','both 后交代共同点，but 后指出一个具体不同点。'),
  listen('Jill and Dan both like making models. Dan works very quickly, but Jill likes to check each step.','听录音。谁更喜欢检查每一个步骤？','Jill|Dan|两人都不检查',0,'but 后明确说 Jill likes to check each step。')),
  upper('feelings','表达感受与回应建议','My feelings','用 feel / be 加感受词，听到 because 后去找原因；建议要回应具体情况。','I feel nervous because I have to speak in class.',`
“I feel worried because I lost my notebook.” Why is the speaker worried?|The notebook is missing.|A friend won a race.|because 后交代丢了笔记本。
别人为第一次表演紧张，哪句是相关的安慰建议？|Take a deep breath. We can practise together.|I bought a new watch.|建议既回应紧张，也给出练习方法。
“At first, Ada felt upset. After talking with her friend, she felt better.” What changed?|Ada’s feelings.|The weather.|felt upset 和 felt better 写出心情的前后变化。
同伴说 “I’m upset about the game.” 哪句回应得体？|I’m sorry to hear that. Do you want to talk?|You must win every time.|第一句表示关心并给对方选择。
`,write('用两句英文写“我有点紧张，因为明天要演讲”，再给自己一条简单建议。','I feel nervous because I have a speech tomorrow. I can practise with a friend today.','第一句有感受和原因，第二句是可实行的办法。'),
  listen('I was worried before the race. After I talked with my coach, I felt much better.','听录音。什么让说话者感觉好一些？','与教练谈话|换了比赛日期|买了一双新鞋',0,'after 后给出了让心情改善的行动。')),
  upper('work-play','工作、活动与频率','Work and play','分清每周习惯和一次安排，留意 usually、often、never 等词的位置。','I usually help in the garden on Sundays.',`
“She often paints after school.” What does she often do?|She paints.|She goes swimming.|often 后的 paints 是经常做的活动。
Which sentence has the usual word order?|I usually play chess on Fridays.|I play usually chess on Fridays.|频率副词通常在实义动词之前。
“Leo helps in the shop on Saturdays. On Sundays he plays the drums.” When does Leo help?|On Saturdays.|On Sundays.|把 on Saturdays 与 helps 连在一起。
想邀请同伴先完成任务再玩，怎么说合适？|Let’s finish the work first and play later.|Let’s finish work yesterday.|first 和 later 交代两个活动的次序。
`,write('用两句英文写一个周末安排。分别说明什么时候做一件家务、什么时候做一项休闲活动。','On Saturday morning, I often water the plants. I play badminton with my cousin in the afternoon.','两个时段和两项活动要能一一对应。'),
  listen('I usually help at the bookshop on Saturday. This Saturday, I will play football in the morning and help at the shop in the afternoon.','听录音。这个周六上午做什么？','踢足球|在书店帮忙|去上学',0,'This Saturday 改到指定那一天，in the morning 对应踢足球。')),
  upper('health','健康习惯与英语建议','Healthy habits','听出频率和健康行为，使用 should、shouldn’t 来给建议，后接动词原形。','You should drink some water after exercise.',`
“You should get enough sleep.” 建议做什么？|保证充足睡眠|熬夜学习|get enough sleep 表示获得足够睡眠。
“He should ___ more water.” 哪项合适？|drink|drinks|should 之后用动词原形。
“Li walks to school every day. She only has sweets on weekends.” Which happens every day?|Walking to school.|Eating sweets.|every day 只修饰走路上学。
同伴复习太晚，总觉得累。哪条建议针对问题？|Try going to bed earlier.|Play outside at midnight.|earlier 意为更早，与睡得太晚的问题相连。
`,write('给经常忘记喝水的朋友写两句英文建议。至少用一次 should。','You should drink water at regular times. You can bring a water bottle to school.','建议与喝水相关；should 后用动词原形。'),
  listen('Kim often goes to bed after midnight. The doctor tells Kim to go to bed earlier and get enough sleep.','听录音。医生建议改变什么？','睡觉时间|书包的重量|每天的早餐种类',0,'go to bed earlier 直接说明建议调整上床时间。')),
  upper('food','可数与不可数食物、礼貌点餐','Food we eat','用 some 表示一些。可数食物能数几个，不可数食物可用杯、碗等量词来数。','I’d like two apples and a bowl of rice.',`
想点一些米饭，用哪句？|I’d like some rice.|I’d like three rices.|rice 通常是不可数名词，可用 some 或 a bowl of。
“How ___ juice do you need?” 应填什么？|much|many|juice 在此不可数，用 how much。
菜单写 “one soup with two rolls”。套餐中有哪些面包？|Two rolls.|One roll.|数量 two 修饰 rolls。
点餐时怎样礼貌询问是否能把牛奶换成水？|Could I have water instead of milk?|I do not know this table.|instead of 表示用前一项替换后一项。
`,write('用两句英语点餐。点两个三明治和一杯水，并明确自己不点果汁。','I’d like two sandwiches and a glass of water, please. No juice, thank you.','食物数量、饮品和礼貌用语清楚。'),
  listen('I have two sandwiches and some grapes. Would you like a sandwich or a bowl of soup?','听录音。说话人给对方哪两种选择？','三明治或汤|葡萄或苹果|米饭或果汁',0,'or 连接 a sandwich 和 a bowl of soup。')),
  upper('nature','观察自然与说明保护办法','Nature and us','用 can 说可做的行动，用 because 解释理由；读通知时区分观察内容和保护规则。','We can take our rubbish home because it keeps the river clean.',`
“The insects live under leaves.” Where do they live?|Under leaves.|Above the trees.|under leaves 给出了观察地点。
想建议“离开时带走垃圾”，哪句切题？|Take your rubbish with you when you leave.|Leave your bottles by the river.|take ... with you 表示随身带走。
牌子说 “Keep to the path to protect the plants.” Why should visitors stay on the path?|To protect the plants.|To find a shop.|to protect 说明遵守路线的目的。
怎样在观察卡上写“我看见两只鸟在树顶”？|I saw two birds at the top of the tree.|I planted two trees under a bird.|第一句说明观察对象、数量和位置。
`,write('给自然观察角写两句英语。一句给出保护建议，一句解释原因。','Stay on the path, please. This helps protect the small plants beside it.','建议可实行，第二句说明它为什么有帮助。'),
  listen('We found two birds by the pond, but we did not get close. We watched them quietly from the path.','听录音。小组如何观察鸟？','从小路安静观察|走进水里|追着鸟跑',0,'quietly from the path 说明观察方式和位置。')),
  upper('phonics','比较字母组合与语音','语音和拼写','辨认 sh、ch、th 等组合。先读整词再对照小组发音。','ship 和 shop 的 sh 都是 /ʃ/。',`
Which word starts with the same sound as ship?|shop|chip|shop 和 ship 开头都是 /ʃ/。
Which word starts with the same sound as chair?|cheese|share|chair、cheese 的 ch 发 /tʃ/。
“thin” 和 “this” 的 th 发音一样吗？|不一样|一样|thin 的 /θ/ 清音与 this 的 /ð/ 浊音不同。
给图中的“贝壳”贴英文标签 __ell，缺哪两个字母？|sh|ch|shell 拼成 sh 开头的词，读 /ʃ/。
`,fill('根据提示补全单词：You sit on a __air. 请填写开头两个字母。','ch','chair 的首音 /tʃ/ 用 ch 表示。','text')),
  upper('reading','读活动表与写短信息','读写综合','圈关键信息，再用完整句给读者写出时间、地点、行动或限制。','“Meet by Room 3 after lunch” 同时给出了地点和时间。',`
“Meet outside Room 8 at 1:30.” Where is the meeting point?|Outside Room 8.|In Room 1.|outside Room 8 是地点。
“Bring gloves, not boots.” Which item is needed?|Gloves.|Boots.|not 排除了靴子。
“It starts at 10:15, but please arrive ten minutes early.” When should you arrive?|10:05.|10:25.|提前十分钟，10:15 减十分钟。
哪句提醒同伴周五带回记录表？|Please bring back the form on Friday.|Please look up the word Friday.|bring back 指带回，on Friday 是日期。
`,write('读书会定在周四下午四点，地点是教学楼门口。写两句英语消息通知同伴。','The reading club meets at four on Thursday afternoon. Please wait at the entrance to the school building.','把时间和地点分别说清楚。')),
  lower('rules','公共规则和遵守理由','Following the rules','区分必须、允许与禁止，用 must、can、mustn’t 或 don’t 表达。','You must put books back. You mustn’t eat here.',`
“You must wear a helmet.” 哪件事是必须的？|戴头盔|带一本书|must 后写义务，helmet 是头盔。
“Don’t ___ the wet paint.” 填什么？|touch|touches|Don’t 后用动词原形。
牌子：“Use the stairs only in an emergency.” 一般情况下应该怎样？|别走这条紧急楼梯|平时总要走这条楼梯|only in an emergency 限定仅限紧急情况。
请写一条节水提醒下列哪个合适？|Turn off the tap after use.|Leave the tap running.|turn off the tap 表示关掉水龙头。
`,write('在图书室规则中写两句英文，提醒同学轻声说话和归还书籍。','Speak quietly in the library. Please put the books back after reading.','动词开头清晰说明两项行动。'),
  listen('You can take photos in the hall, but you must not use a flash. Please keep your voice down.','听录音。在大厅拍照时不能用什么？','闪光灯|相机|声音很小的设备',0,'must not use a flash 表示禁止使用闪光灯。')),
  lower('community','社区场所、问路和指路','Our community','用地标确定路线，听清 first、second、opposite 与 turn left/right。','Turn right at the bank. The library is across from the park.',`
“The bank is opposite the station.” Which word shows the relationship?|opposite|station|opposite 表示在……对面。
“Excuse me, how can I get to the park?” 哪句回答了问题？|Go straight and turn left at the school.|The park is green.|前一句说明了怎么走。
“Walk past the shop. The library is on your right.” What do you pass?|The shop.|The library.|pass 的宾语 shop 是经过的地点。
提醒参观者从第二个路口右转，选哪句？|Turn right at the second crossing.|Turn left at the first crossing.|right、second 要与要求核对。
`,write('写两句英文给朋友指路。让朋友直走，在邮局左转，图书馆就在左边。','Go straight and turn left at the post office. The library is on your left.','先给路线动作，再说最终地点的位置。'),
  listen('Walk past the post office and turn left at the shop. The sports centre is on your right.','听录音。应该在哪里左转？','商店|邮局|体育中心',0,'at the shop 紧跟在 turn left 后面。')),
  lower('seasons','不同季节的生活和比较','Life in different seasons','读懂活动与季节的对应关系，比较时留意 colder、longer 等变化。','Days are longer in summer than in winter.',`
“In spring, we often fly kites.” 什么时候常放风筝？|春季|冬季|In spring 给出季节。
“Winter is ___ than autumn here.” 填什么？|colder|coldest|than 用在比较结构，应用比较级 colder。
“It rains a lot in summer, but winter is dry.” Which season is dry?|Winter.|Summer.|but 后说明 winter 干燥。
要说明“我喜欢秋天，因为天气凉爽”，选哪句？|I like autumn because it is cool.|I like summer because it is cool.|autumn 对应秋天，because 后给原因。
`,write('用英文说明你最喜欢的季节和原因，并写一句在这个季节常做的活动。','I like spring best because it is warm. I often take walks with my family in spring.','给出季节、理由和适合的活动。'),
  listen('It is windy in April, so we often fly kites. In July it is hot, and we usually swim.','听录音。七月通常做什么？','游泳|放风筝|打雪仗',0,'July 后的 usually swim 与题干相符。')),
  lower('hometown','介绍家乡、景点和特色','My hometown','先说明地点，再挑一两个可观察特点或活动，用 be famous for 表达特色。','My hometown is famous for its old bridges.',`
“My hometown lies by a river.” 家乡在哪里？|在河边|在山顶|by a river 表示靠河。
哪一句能表达“这个镇以茶出名”？|The town is famous for its tea.|The town waits for tea.|is famous for 后接特色事物。
“Visitors can walk along the river and try rice cakes.” 提到了什么食物？|Rice cakes.|Noodles.|try 的宾语说明可尝试的食物。
向游客介绍景点和开放日，哪句信息齐全？|The old tower is open on Sundays.|The old tower opens.|on Sundays 补充了具体日期。
`,write('介绍你的家乡或熟悉的地方。用两句英文写一个特色和一项游客可以做的活动，可用虚构地名。','My town is famous for its old bridge. Visitors can take a walk along the river.','写可辨认的特色和实际可做的活动。'),
  listen('My hometown is small. It is famous for its spring flower festival. People come to take photos near the lake.','听录音。这个地方以什么活动闻名？','春季花节|冬季运动会|夏季书市',0,'is famous for 后紧跟 spring flower festival。')),
  lower('travel','旅行交通和途中安排','Travelling around','用 by 加交通工具，步行说 on foot。比路线时留意出发、换乘、到达。','We go by bus and then walk to the museum.',`
“I go to the museum on foot.” 怎么去？|步行|坐公交|on foot 是固定搭配。
哪句表示乘火车去北京？|We go to Beijing by train.|We go to Beijing on train.|说方式可用 by train，没有冠词。
“Take Bus 4 and change to Bus 9 at the park.” Where should you change buses?|At the park.|At the school.|change ... at the park 表示在公园换车。
两张票去同一地点，A 车 8:15 到，B 车 8:45 到。Which arrives earlier?|Bus A.|Bus B.|earlier 是更早到的，8:15 早于 8:45。
`,write('写两句英文告诉伙伴去博物馆的路线。先坐 8 路公交，到公园下车，再步行。','Take Bus 8 and get off at the park. Then walk to the museum.','写清公交线路、下车地点和最后的步行。'),
  listen('The first bus leaves at eight, but we will take the nine o’clock train because it is faster.','听录音。小组选择乘坐什么交通工具？','九点的火车|八点的公交|九点的公交',0,'but 后描述决定，train 是火车。')),
  lower('plan','制订旅行计划并表述将来','Making a travel plan','用 be going to 或 will 描述计划，说明何时、去哪儿、怎么走。留意备用计划的条件。','We are going to visit the park if it is sunny.',`
“We are going to leave at seven.” 表示什么？|计划七点出发|已经七点到过|be going to 描述计划。
“Mia will ___ the tickets.” 填什么？|buy|buys|will 后用动词原形。
“If it rains, we will visit the indoor museum.” What will we do if it rains?|Visit the indoor museum.|Have a picnic outside.|if 给出适用条件。
计划卡要写“我们周六乘公交到动物园”，哪句信息齐全？|We are going to the zoo by bus on Saturday.|We have a bus ticket.|第一句交代目的地、交通方式和时间。
`,write('写三句英文制订周六的参观计划，说明时间、交通方式和一个雨天备选安排。','We are going to visit the park at nine on Saturday. We will go there by bus. If it rains, we will visit the museum instead.','时间、交通、目的地和备选安排要对应。'),
  listen('We will meet at half past eight. If it rains, we will take the underground to the science museum instead of walking to the park.','听录音。下雨时计划怎么去哪里？','乘地铁去科技馆|步行去公园|乘公交去图书馆',0,'If it rains 后给出的交通方式是地铁，地点是科技馆。')),
  lower('phonics','比较元音组合和词内发音','语音和拼写','注意同一字母组合在不同词里可能有不同读音，比较时要读整词核对。','boat 的 oa 发 /əʊ/ 或 /oʊ/，和 coat 相同。',`
Which word has the same vowel sound as road?|boat|bread|road 和 boat 的 oa 都读长 o。
Which word sounds like light in the middle?|night|lit|light 和 night 的 igh 都发 /aɪ/，lit 只有短音。
“tea” 与 “bread” 中的 ea 发音一样吗？|不一样|一样|tea 是 /iː/，bread 是 /e/。
给“外套”标英文 c__t，中间缺什么？|oa|oo|coat 用 oa 拼写。
`,fill('补全单词：We will take a b__t across the lake. 填写中间两个字母。','oa','boat 中间是 oa，词义与过湖的情境相符。','text')),
  lower('reading','读旅行表格并写活动通知','读写综合','先看题目要找时间、地点还是条件，再读对照栏。写通知要让读者知道下一步怎样做。','“If it rains, meet at Room 5” 说明雨天地点。',`
“Bus to Lake Park: 8:45. Fare: ¥6.” What is the fare?|6 yuan.|8 yuan.|fare 是车费，8:45 是时间。
“Pick up your ticket before 9:30.” Can you pick it up at 10:00?|No.|Yes.|before 9:30 说明必须在那之前。
“Sunny: meet at the east gate. Rainy: meet inside the hall.” Where do we meet in the rain?|Inside the hall.|At the east gate.|按 rainy 一栏选地点。
要给同伴发出“在地铁站门口见”，哪句可用？|Meet me at the entrance to the underground station.|Read the museum map tomorrow.|entrance to ... 指某处的入口。
`,write('社团通知周日上午 9 点在公交站集合，如果下雨改到校门口。用两句英文写出条件和安排。','We meet at the bus stop at nine on Sunday morning. If it rains, we will meet at the school gate.','两个地点各自对应一种天气条件。'))
];

const mathTopic = (book,id,title,unit,lesson,example,questions) => ({...label(book,id,title,unit,lesson,example),questions});
const mTop = (...args) => mathTopic('g5a',...args);
const mBottom = (...args) => mathTopic('g5b',...args);
const decimalValue = (n,digits) => {
  const fixed=(n/10**digits).toFixed(digits);
  return [...new Set([fixed,String(Number(fixed)),fixed+'0'])].join('|');
};
const fraction = (ask, n, d, why) => ({...fill(ask,`${n}/${d}`,why,'text'),answerFormat:'lowest-fraction'});

const math = [
  mTop('multiply','小数乘法、估算与近似值','小数乘法','先按整数乘，再确定小数点。估算可以检查积的大小。','2.4×1.5 可先算 24×15，然后从积右边数两位。',[
    fill('2.36 × 1.5 等于多少？','3.54|3.540','236×15＝3540，积有三位小数，3.540＝3.54。','decimal'),
    pick('0.48 × 0.9 和 0.48 比，哪一个大？','0.48 较大|积较大|一样大',0,'乘一个小于 1 的正数，结果变小。'),
    fill('测得丝带每米重 0.45 千克，4.2 米约重多少千克？四舍五入到十分位。','1.9|1.90','0.45×4.2＝1.89，百分位 9 向前进一。','decimal'),
    fill('北京展览购买 2.8 米布，每米 15.5 元，应付多少元？','43.40|43.4|43.400','15.5×(3−0.2)＝46.5−3.1＝43.4。','decimal')]),
  mTop('divide','小数除法、循环小数和取近似','小数除法','除数变成整数时，被除数的小数点也往相同方向移动同样位数。','3.6÷0.12＝360÷12＝30。',[
    fill('7.56 ÷ 0.6 等于多少？','12.6|12.60','转为 75.6÷6。','decimal'),
    pick('2÷3 的商里不断重复的数字是什么？','2|6|9',1,'2÷3＝0.666…，6 不断重复。'),
    fill('一根丝带长 14.4 米，每条截成 0.75 米，最多截成几条？',19,'14.4÷0.75＝19.2，只数完整条数，取 19。'),
    fill('广州活动需装 9.5 千克豆子，每袋最多装 0.6 千克。至少要几个袋？',16,'15 袋装 9 千克，剩 0.5 千克还要一袋。')]),
  mTop('position','数对与平面位置','位置','数对先写列再写行。比较两点时分开看横向和纵向。','从（3，2）向上移 4 格，得到（3，6）。',[
    pick('数对（6，3）表示哪一位置？','第 6 列、第 3 行|第 3 列、第 6 行|第 6 行、第 3 列',0,'数对第一项是列，第二项是行。'),
    pick('从（5，4）移到（5，7），哪个量没有变化？','列号|行号|两个都没变',0,'两个数对的第一个数都是 5。'),
    fill('P 在（2，8），Q 在（7，8）。P 向右走几格能到 Q？',5,'行号相同，列号增加 7−2＝5。'),
    pick('深圳座位图里小安在（4，5）。前进规则为“列加 2，行减 1”。新位置在哪里？','（6，4）|（2，6）|（4，6）',0,'依次计算 4＋2 和 5−1。')]),
  mTop('chance','可能性、比较与公平','可能性','先判断必然、可能或不可能。机会均等的物件中，再比较符合要求的数量。','同样大小的 4 个红球和 2 个黄球混抽，红球更容易抽到。',[
    pick('只有蓝球的盒子里任摸一个，摸到蓝球属于什么？','一定发生|可能但不一定|不可能',0,'所有可抽结果都是蓝球。'),
    pick('同样大小的纸牌有三张星星、一张月亮。随机抽一张，谁更可能？','星星|月亮|一样可能',0,'星星种类有三张，月亮只有一张。'),
    multi('袋中同样大小的球有红球 3 个、蓝球 3 个、黄球 1 个。哪些说法正确？','摸红和摸蓝的机会相同|摸黄的机会比红小|一定摸到红球|可能摸到绿球',[0,1],'对照每种球的数量与有无。'),
    pick('上海活动随机抽牌决定谁先开始。怎样设置最公平？','两队牌数相同，大小和手感也相同，混匀后抽|各队牌数不同|给甲队铺更容易摸到的大牌',0,'让每队中奖对应同等数量、同等机会的牌。')]),
  mTop('equations','用等量关系列方程','简易方程','找到等量关系后设未知数。解方程时等式两边做同样的运算，用代入验算。','若 3 盒再加 4 个共 25 个，设每盒 x 个，列 3x＋4＝25。',[
    fill('解方程：4x + 9 = 53，x 等于多少？',11,'两边减 9 得 4x＝44，再除以 4。'),
    pick('等式两边同时加 7，会怎样？','仍然相等|左边变大但右边不变|一定不相等',0,'相等的两个数量各增加同样多，仍相等。'),
    fill('整理活动材料，4 个等量盒加上 6 张散卡合计 70 张。每盒多少张？',16,'设每盒 x 张，等量关系 4x＋6＝70。'),
    fill('广州活动两队共写 75 张卡，甲写的比乙多 15 张。乙写了多少张？',30,'设乙 x，x＋(x＋15)＝75，解得 x＝30。')]),
  mTop('area','平行四边形、三角形与梯形面积','多边形的面积','画出与底垂直的高。复杂图形可分割重组，并核对有无重叠或遗漏。','三角形面积为底×高÷2；梯形先把上下底相加。',[
    fill('平行四边形底 13 厘米、高 8 厘米，面积多少平方厘米？',104,'底×高＝13×8。'),
    pick('求三角形面积，哪种长度能当作底边对应的高？','从对角顶点垂直到底所在直线的长度|从顶点任意斜着量到底边|另一条边的长度一定是高',0,'高必须与所选底边垂直。'),
    fill('图纸上的梯形上底 8 米、下底 16 米、高 5 米。面积多少平方米？',60,'(8＋16)×5÷2＝60。'),
    fill('深圳展台由一个 10×7 米的长方形和一个底 10 米、高 4 米的三角形拼成，内部不重叠。面积共多少平方米？',90,'70＋10×4÷2＝90。')]),
  mTop('planting','植树问题与间隔模型','数学广角','总长÷间距是间隔数。两端都放比间隔多 1，两端都不放少 1，闭合一圈相等。','40 米每 10 米立一根且两端都立，有 4 个间隔、5 根。',[
    fill('60 米直路每隔 6 米植树，两端都种。一共几棵？',11,'60÷6＝10 个间隔，两端都种得 11 棵。'),
    pick('四周闭合的环形步道等距放灯，灯数与间隔数什么关系？','相等|灯数多 1|灯数少 1',0,'起点和终点是同一处。'),
    fill('学校直道长 36 米，每隔 4 米放一块提示牌，两端都不放。放多少块？',8,'36÷4＝9，共 9−1＝8 块。'),
    fill('北京展区直边从左端标记到右端共 50 米。每隔 5 米贴标记，左右端各贴一块，共贴几块？',11,'10 个间隔加一个端点，总数 11。')]),
  mTop('pricing','小数综合应用与方案比较','解决问题','先看数量、单价和费用单位，按规则算两种方案。估计比较时再用准确值检验。','需付车费后才结束的方案，要把车费也并入总支出。',[
    fill('每千克 8.5 元，买 2.4 千克共多少钱？','20.4|20.40','8.5×2.4＝20.4。','decimal'),
    pick('实际到场人数为 101，人均一副手套，为什么不能只按 100 估算购买？','会少一副|会多十副|价格必定相同',0,'估算无法替代保证每个人都领取所需的实际数量。'),
    fill('价目：A 店每米 7.25 元另收 4 元送货；B 店每米 8 元包送。买 8 米，A 店总价是多少元？',62,'7.25×8＋4＝62。'),
    fill('上海活动准备每人 0.35 米丝带，共给 18 人。商店按整米售卖，至少买多少米？',7,'需要 6.3 米，整米购买需向上取 7。')]),
  mBottom('factors','因数、倍数与质合数','因数和倍数','整除关系中，小数是大数的因数，大数是小数的倍数；这里的数是非零自然数。质数恰有两个正因数。','24 是 6 的倍数，6 是 24 的因数。',[
    pick('哪个数是质数？','1|21|23',2,'23 只有 1 和 23 两个正因数。'),
    pick('4×9＝36，下列哪句话完整准确？','4 是 36 的因数|4 是因数，无需说明哪个数|9 是 36 的倍数',0,'因数和倍数描述两个数之间的关系。'),
    multi('要把 36 张纸均分成若干组。哪些组数能正好分完？','4|5|6|8',[0,2],'4 和 6 是 36 的因数。'),
    fill('广州小组每 6 天整理一次图书，每 8 天检查一次工具。今天同时进行，再过至少几天又同时进行？',24,'6 和 8 的最小公倍数是 24。')]),
  mBottom('fractions','分数意义、约分和通分','分数的意义和性质','判断单位“1”。约分时分子分母同除以公因数，通分时同乘换成相同分母。','18/24 约分时同除以 6，得到 3/4。',[
    fraction('把 15/25 约成最简分数。',3,5,'分子分母同时除以 5。'),
    pick('比较 5/8 与 3/4，哪项成立？','5/8＜3/4|5/8＞3/4|两数相等',0,'3/4＝6/8，分母相同就比 5 和 6。'),
    fraction('观察表记着 30 粒中有 18 粒发芽。发芽数占全部的几分之几？请写最简分数。',3,5,'18/30 将分子分母同时除以 6。'),
    fraction('北京展示计划从 24 张照片挑出 9 张。挑出数量占全部的几分之几？请写最简分数。',3,8,'分母表示全部 24 张，分子表示挑出 9 张，再同除以 3。')]),
  mBottom('fraction-calc','异分母分数加减和简算','分数的加法和减法','异分母加减先通分，算出分子后约成最简分数。可先找凑整的两个分数。','1/2＋1/3＝3/6＋2/6＝5/6。',[
    fraction('1/4 + 1/6 等于多少？请写最简分数。',5,12,'通分到 12，3/12＋2/12＝5/12。'),
    pick('为什么不能把 1/2＋1/5 算成 2/7？','每份大小不同，须先把分数单位统一|分母只允许使用偶数|所有分数只能相减',0,'一半和五分之一的每份大小不同。'),
    fraction('记录写第一天用去一根彩带的 1/3，第二天用去同一根的 1/5。两天共用几分之几？请写最简分数。',8,15,'1/3＝5/15，1/5＝3/15。'),
    fraction('上海任务两次已完成总量的 1/4 和 1/2，还剩总量的几分之几？请写最简分数。',1,4,'1−1/4−1/2＝1/4。')]),
  mBottom('cuboids','长方体、正方体的表面积和体积','长方体和正方体','表面积求外面的面积，体积求占空间的大小。长、宽、高统一单位。','长方体前后两个面面积相同，体积是底面积乘高。',[
    fill('正方体棱长 4 厘米，体积是多少立方厘米？',64,'4×4×4＝64。'),
    pick('想知道给封闭纸盒外侧贴纸要多大，应求什么？','六个面的表面积|盒内的容积|每条棱的和',0,'需要贴纸的面积是六个外面的总面积。'),
    fill('包装图纸给出长 10、宽 6、高 4 厘米。封闭盒的表面积是多少平方厘米？',248,'2×(60＋40＋24)＝248。'),
    fill('在深圳模型桌，长方体木块底面积 54 平方厘米、高 7 厘米。体积多少立方厘米？',378,'底面积×高＝54×7。')]),
  mBottom('capacity','体积单位与容积换算','长方体和正方体','相邻体积单位的进率是 1000。1 立方分米等于 1 升，1 立方厘米等于 1 毫升。','0.6 L＝600 mL。',[
    fill('3.5 立方分米等于多少立方厘米？',3500,'1 立方分米＝1000 立方厘米。'),
    pick('同样一个盒子，外部尺寸与内部尺寸不一样。求能装几升水优先用什么？','内部尺寸|外部尺寸|只有棱长总和',0,'容积由容器内部可用空间决定。'),
    fill('箱内底面积 360 平方厘米，水深 5 厘米，水有多少毫升？',1800,'水体积＝360×5＝1800 立方厘米，与毫升数相等。'),
    fill('北京活动要把 2.2 升饮品倒进 200 毫升的杯子，最多倒满几杯？',11,'2200÷200＝11。')]),
  mBottom('rotation','旋转中心、方向与角度','图形的运动','先标中心，再按方向转指定角度。同一点与旋转中心的距离保持相同。','分针顺时针走 15 分钟，转过 90°。',[
    fill('钟表分针转一整圈是 360°。转了 20 分钟是多少度？','120|120°','每分钟转 6°，20×6＝120。'),
    pick('绕点 O 旋转后，点 P 与点 O 的距离怎样？','保持相等|一定加倍|一定缩短',0,'旋转只改变方向，与中心的距离不变。'),
    pick('箭头向上，绕箭尾逆时针转 90° 后指向哪边？','左|右|下',0,'以上为起点，逆时针四分之一圈到左。'),
    fill('广州模型指针从正右方顺时针经过正下方，转到正左方。最少转了多少度？','180|180°','顺时针转过两个直角。')]),
  mBottom('line-chart','折线统计图与趋势比较','折线统计图','先看横轴的时间、纵轴的单位，再读折线的点位与相邻两次的变化。','同一时间间隔内，折线上升更高说明增加量更大。',[
    pick('想突出同一指标连续几次的变化，哪种图更合适？','折线统计图|单张示意地图|文字标签样板',0,'按时间连点能看出起伏。'),
    pick('两段升得同样高，但横向时间一个 1 天、一个 3 天。哪个变化更快？','1 天的变化更快|3 天的变化更快|一样快',0,'同样的增量用时间更少，变化更快。'),
    {...fill('看图。第三天比第二天的阅读记录增加多少分钟？',5,'读坐标得 17 分钟和 12 分钟，17−12＝5。'),
      visual:{kind:'trend',unit:'分钟',values:[9,12,17,15]}},
    fill('深圳活动登记：周一到周四分别 20、32、28、38 人。相邻两天增加最多的一段增加多少人？',12,'相邻三段差为 12、−4、10，最大的增加是 12。')]),
  mBottom('balance','称重找次品与最少次数','数学广角','天平有左轻、右轻、平衡三种结果。把候选尽量分为三组，每次尽量缩小剩下的范围。','9 件只有一件偏轻，分 3、3、3，第一次就能确定某一组。',[
    fill('3 个外观一样的零件仅 1 个较轻。用无砝码天平，最少称几次一定找出？',1,'称 1 对 1，不平衡找轻的一侧，平衡就是剩下的一件。'),
    pick('9 件中 1 件较轻，第一次称怎么分更稳妥？','3、3、3|4、4、1|1、1、7',0,'最坏情况只剩 3 件，一次就可继续分辨。'),
    fill('27 件中仅有 1 件偏轻，最坏情况最少称几次能找出？',3,'每次尽量把候选分成三组，27→9→3→1。'),
    fill('上海实验角 5 盒只含 1 盒较轻，最少称几次保证找出？',2,'先称 2 对 2，平衡直接找出，偏轻一侧的两盒再称一次。')])
];

function coreLanguage(items,offset) {
  return items.map(({cards,application,material,...item},index)=>{
    assert.equal(cards.length,4,item.id);
    const [basic,mistake,left,right] = cards.map(row => {
      const parts = row.split('|');
      assert.ok(parts.length===4 && parts.every(Boolean) && parts[1]!==parts[2],item.id);
      return parts;
    });
    const [question,correct,wrong,why] = basic;
    const [trap,a,b,check] = mistake;
    const [first,c,d,leftProof] = left;
    const [second,e,f,rightProof] = right;
    const city = ['北京','上海','广州','深圳'][(index+offset)%4];
    return {...item,questions:[
      pick(`按本课方法想一想。\n${question}`,`${wrong}|${correct}`,1,why),
      pick(`有人把这题答成“${b}”。请重新判断。\n${trap}`,`${a}|${b}`,0,check),
      material ?? multi(`逐条阅读，两条材料各选一个正确答案。\n甲　${first}\n乙　${second}`,
        `甲：${c}|甲：${d}|乙：${f}|乙：${e}`,[0,3],`甲：${leftProof} 乙：${rightProof}`),
      {...application,city,ask:`${city}任务。\n${application.ask}`}
    ]};
  });
}

const size = 8;
const group = (name, make) => [name,Array.from({length:size},(_,i)=>make(i))];
function drill(book,id,title,category,lesson,groups) {
  return {...label(book,`calc-${id}`,title,category,lesson,''),
    drill:{size,category,sets:groups.map(([name])=>name)},questions:groups.flatMap(([,questions])=>questions)};
}
const int = (ask,n,why) => fill(ask,n,why);
const dec = (n,digits=2) => (n/10**digits).toFixed(digits);
function gcd(a,b) { return b ? gcd(b,a%b) : a; }
function reduced(ask,n,d,why) {
  const g=gcd(n,d);
  return fraction(ask,n/g,d/g,`${why} 化成最简分数为 ${n/g}/${d/g}。`);
}
function product(a,b,leftPlaces,rightPlaces) {
  const places=leftPlaces+rightPlaces;
  return fill(`${dec(a,leftPlaces)} × ${dec(b,rightPlaces)} 等于多少？`,decimalValue(a*b,places),
    `先按整数算 ${a}×${b}＝${a*b}，从右侧数 ${places} 位点小数点。`,'decimal');
}
function decimalDivision(divisor,quotient,places) {
  const d=dec(divisor,places),n=dec(divisor*quotient,places);
  return int(`${n} ÷ ${d} 等于多少？`,quotient,`同乘 ${10**places}，变为 ${divisor*quotient}÷${divisor}。再用 ${d}×${quotient}＝${n} 验算。`);
}

const drills = [
  drill('g5a','multiply','小数乘法与估算','小数乘法','先按整数相乘，小数位数由两个因数的小数位数累加决定。',[
    group('小数乘整数',i=>product(213+i*31,12+i*3,2,0)),
    group('小数乘小数',i=>product(45+i*9,23+i*4,1,2)),
    group('计算积并保留两位小数',i=>{
      const a=95+i*10,b=17+i*11,raw=a*b,result=Math.floor((raw+5)/10);
      return fill(`${dec(a)} × ${dec(b,1)}，四舍五入保留两位小数。`,decimalValue(result,2),
        `先算出积 ${dec(raw,3)}，再看千分位是 ${raw%10}，得 ${dec(result)}。`,'decimal');
    })
  ]),
  drill('g5a','divide','小数除法、试商和取整','小数除法','先统一除数和被除数小数点的移动位数。根据应用题语境决定向上或向下取整。',[
    group('整数除数、小数商',i=>{
      const d=3+i,q=22+i*7,n=d*q;
      return fill(`${dec(n,1)} ÷ ${d} 等于多少？`,decimalValue(q,1),`${n} 个十分之一平均分给 ${d} 份，每份 ${q} 个十分之一。`,'decimal');
    }),
    group('除数是小数',i=>decimalDivision(12+i*7,7+i*4,(i%2)+1)),
    group('剩一点也要另装一袋',i=>{
      const d=5+i*2,q=12+i,theRest=d*q+1+i%3;
      return int(`${dec(theRest,1)} 千克粮食，每袋最多装 ${dec(d,1)} 千克。至少需要几袋？`,q+1,`${q} 袋只能装 ${dec(d*q,1)} 千克，余下的还要另装一袋。`);
    })
  ]),
  drill('g5a','equations','简易方程和等量关系','简易方程','先明确等量关系，再对等式两边做相同运算。',[
    group('加减型方程',i=>{
      const a=17+i*4,x=31+i*6;
      return int(`解方程 x + ${a} = ${x+a}，x 等于多少？`,x,`两边都减去 ${a}。`);
    }),
    group('乘加型方程',i=>{
      const a=4+i,b=11+i*3,x=18+i*7;
      return int(`解方程 ${a}x + ${b} = ${a*x+b}，x 等于多少？`,x,`两边减去 ${b}，再除以 ${a}。`);
    }),
    group('根据相差量列方程',i=>{
      const b=18+i*2,x=21+i*7;
      return int(`甲、乙共做 ${2*x+b} 张卡，甲比乙多 ${b} 张。乙做几张？`,x,`设乙 x 张，x＋(x＋${b})＝${2*x+b}。`);
    })
  ]),
  drill('g5a','applications','多边形面积和间隔模型','面积与数量关系','先画图标条件，面积注意底和高对应，个数注意端点。',[
    group('三角形面积',i=>{
      const a=10+i*2,b=6+i;
      return int(`三角形底 ${a} 米、高 ${b} 米，面积多少平方米？`,a*b/2,`底×高÷2＝${a*b/2}。`);
    }),
    group('梯形面积',i=>{
      const a=8+i*2,b=16+i*4,c=5+i;
      return int(`梯形上底 ${a} 厘米、下底 ${b} 厘米、高 ${c} 厘米。面积多少平方厘米？`,(a+b)*c/2,`（上底＋下底）×高÷2。`);
    }),
    group('两端不摆或只摆一端',i=>{
      const step=4+i,segments=11+i*2,bothAbsent=i%2===0;
      return int(`直路 ${step*segments} 米，每隔 ${step} 米放提示牌，${bothAbsent?'两端都不放':'只放左端，不放右端'}。一共放几块？`,
        bothAbsent?segments-1:segments,`有 ${segments} 个间隔。两端不放少 1，只放一端与间隔数相同。`);
    })
  ]),
  drill('g5b','factors','因数倍数与公倍数','因数与倍数','可以列举因数和倍数，也可先确定两个数的最大公因数。',[
    group('求最大公因数',i=>{
      const a=14+i*7,b=21+i*3;
      return int(`求 ${a} 和 ${b} 的最大公因数。`,gcd(a,b),`列出两个数的因数，最大的共同因数是 ${gcd(a,b)}。`);
    }),
    group('求最小公倍数',i=>{
      const a=5+i,b=10+i*2,r=a*b/gcd(a,b);
      return int(`求 ${a} 和 ${b} 的最小公倍数。`,r,`${b} 已经是 ${a} 的倍数，最小公倍数是 ${r}。`);
    }),
    group('周期再次同时发生',i=>{
      const a=6+i,b=9+i*2,r=a*b/gcd(a,b);
      return int(`甲灯每 ${a} 秒闪，乙灯每 ${b} 秒闪。现在同时闪，至少过多少秒又同闪？`,r,`共同闪动时刻是 ${a}、${b} 的公倍数，最小正数是 ${r}。`);
    })
  ]),
  drill('g5b','reduce','约分、通分和分数大小','分数的性质','先找到可同除的公因数，或一起换到合适的共同分母。',[
    group('把给出的分数约成最简',i=>{
      const a=3+i,b=8+i*3,m=i+2;
      return reduced(`把 ${a*m}/${b*m} 约成最简分数。`,a*m,b*m,`可先同除以 ${m}，检查结果还能否缩小。`);
    }),
    group('按部分与总数写分数',i=>{
      const total=32+i*5,count=12+i*3;
      return reduced(`${total} 张书签里有 ${count} 张蓝色。蓝色占几分之几？请写最简分数。`,count,total,'把蓝色的张数作为分子，总张数作为分母。');
    }),
    group('补出指定分母的分子',i=>{
      const a=2+i,b=a+5,scale=3+i;
      return int(`${a}/${b} 和分母为 ${b*scale} 的分数相等。分子应是多少？`,a*scale,`分母乘了 ${scale}，分子也要乘 ${scale}。`);
    })
  ]),
  drill('g5b','fractions','异分母加减与简单运用','分数加减','通分后用相同的分数单位运算，再约分。',[
    group('两分数相加',i=>{
      const a=3+i,b=5+i*2;
      return reduced(`1/${a} + 1/${b} 等于多少？请写最简分数。`,a+b,a*b,`以 ${a*b} 作共同分母，两项分子为 ${b} 和 ${a}。`);
    }),
    group('两分数相减',i=>{
      const a=4+i,b=7+i*2;
      return reduced(`1/${a} − 1/${b} 等于多少？请写最简分数。`,b-a,a*b,`先通分，分子相减得 ${b-a}。`);
    }),
    group('从整体中减去两个部分',i=>{
      const a=4+i,b=9+i;
      return reduced(`完成总量的 1/${a} 后，再完成总量的 1/${b}。还剩总量的几分之几？请写最简分数。`,a*b-a-b,a*b,`把总量 1 写为 ${a*b}/${a*b}，连续减去两个部分。`);
    })
  ]),
  drill('g5b','volume','表面积、体积和单位换算','空间测量','区分外面的面积和里面能装多少。统一单位后再乘。',[
    group('封闭长方体表面积',i=>{
      const a=9+i,b=5+i%4,c=4+i*2;
      return int(`封闭长方体的长、宽、高为 ${a}、${b}、${c} 厘米，表面积是多少平方厘米？`,2*(a*b+a*c+b*c),'把三种面的面积分别算出，每种相同的面有两个。');
    }),
    group('长方体容积',i=>{
      const a=15+i*2,b=12+i,c=6+i;
      return int(`容器内部长 ${a}、宽 ${b}、高 ${c} 厘米，装满最多有多少毫升？`,a*b*c,`长×宽×高得 ${a*b*c} 立方厘米，也就是相同毫升数。`);
    }),
    group('立方分米转换',i=>{
      const a=65+i*13;
      return int(`${dec(a)} 立方分米等于多少立方厘米？`,a*10,`相邻体积单位进率是 1000，${dec(a)}×1000＝${a*10}。`);
    })
  ])
];

const core = {cn:coreLanguage(chinese,0),math,en:coreLanguage(english,2)};
const transcripts=Object.fromEntries(core.en.flatMap(item=>item.questions.flatMap((q,index)=>q.audio?[[`${item.id}-${index+1}`,q.audio]]:[])));
if (process.argv[2]==='--transcripts') {
  console.log(JSON.stringify(transcripts));
  process.exit(0);
}
const read = name => fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');
const save = (name,old,next) => { if (old!==next) fs.writeFileSync(path.resolve(__dirname,'..',name),next); };
const cityFile=read('city-bank.js');
const cityRegion=/^const fifthLanguage = [\s\S]*?;\r?\n(?=\/\/ End grade five language cases\.)/m;
assert.ok(cityRegion.test(cityFile),'Missing grade-five city range.');
const cityCases=entries=>Object.fromEntries(entries.map(({id,cards})=>[id,cards.join('\n')]));
const newCity=cityFile.replace(cityRegion,()=>`const fifthLanguage = ${JSON.stringify({cn:cityCases(chinese),en:cityCases(english)},null,2)};\n`);
const cityModule={exports:{}};
require('node:vm').runInNewContext(newCity,{module:cityModule});
const cityBank=cityModule.exports;
const books=new Set(['g5a','g5b']);
for(const book of books) {
  const topics=Object.values(core).flat().filter(item=>item.book===book);
  assert.equal(topics.length,24,book);
  for(const item of topics) {
    assert.equal(item.questions.length,4,item.id);
    assert.equal(cityBank[item.id].length,32,item.id);
  }
  const calculations=drills.filter(t=>t.book===book).flatMap(t=>t.questions);
  assert.equal(calculations.length,96,book);
  assert.equal(new Set(calculations.map(q=>q.ask)).size,96,book);
}

const homepage=read('index.html');
const bankRegion=/(<script id="question-bank" type="application\/json">)([\s\S]*?)(<\/script>)/;
const match=homepage.match(bankRegion);
assert.ok(match,'Missing question bank.');
const bank=JSON.parse(match[2]);
for(const [subject,items] of Object.entries(core)){
  const add=subject==='math'?[...items,...drills]:items;
  bank[subject]=[...bank[subject].filter(t=>!books.has(t.book)),...add];
}
const topicIds=Object.values(bank).flat().map(t=>t.id);
assert.equal(topicIds.length,new Set(topicIds).size,'Duplicate topic ID.');
let output=homepage.replace(bankRegion,(_,start,previous,end)=>
  `${start}\n${JSON.stringify(bank,null,2).replaceAll('<','\\u003c')}\n${end}`);
if(process.argv[2]){
  const tracks=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
  assert.deepEqual(Object.keys(tracks).sort(),Object.keys(transcripts).sort(),'Missing or unexpected grade-five audio.');
  const audioRegion=/const audioTracks = (\{[^\r\n]*\});/;
  assert.ok(audioRegion.test(output),'Missing audio track list.');
  output=output.replace(audioRegion,(_,previous)=>`const audioTracks = ${JSON.stringify({...JSON.parse(previous),...tracks})};`);
}
save('city-bank.js',cityFile,newCity);
save('index.html',homepage,output);
for(const book of books) console.log(`${book}: 96 core, 96 calculation and 768 city questions.`);
