import {Buff, BuffRange, Buffs, BuffSource} from "./Buff";
import Chalet from "./Builds/Chalet";
import SteelStructureHouse from "./Builds/SteelStructureHouse";
import Bungalow from "./Builds/Bungalow";
import SmallApartment from "./Builds/SmallApartment";
import Residential from "./Builds/Residential";
import TalentApartment from "./Builds/TalentApartment";
import GardenHouse from "./Builds/GardenHouse";
import ChineseSmallBuilding from "./Builds/ChineseSmallBuilding";
import SkyVilla from "./Builds/SkyVilla";
import RevivalMansion from "./Builds/RevivalMansion";
import ConvenienceStore from "./Builds/ConvenienceStore";
import School from "./Builds/School";
import ClothingStore from "./Builds/ClothingStore";
import HardwareStore from "./Builds/HardwareStore";
import VegetableMarket from "./Builds/VegetableMarket";
import BookCity from "./Builds/BookCity";
import BusinessCenter from "./Builds/BusinessCenter";
import GasStation from "./Builds/GasStation";
import FolkFood from "./Builds/FolkFood";
import MediaVoice from "./Builds/MediaVoice";
import WoodFactory from "./Builds/WoodFactory";
import PaperMill from "./Builds/PaperMill";
import WaterPlant from "./Builds/WaterPlant";
import PowerPlant from "./Builds/PowerPlant";
import FoodFactory from "./Builds/FoodFactory";
import SteelPlant from "./Builds/SteelPlant";
import TextileMill from "./Builds/TextileMill";
import PartsFactory from "./Builds/PartsFactory";
import TencentMachinery from "./Builds/TencentMachinery";
import PeoplesOil from "./Builds/PeoplesOil";
import {BuildingRarity} from "./Building";
import {getData} from "./Level";
import {getFlagArrs, renderSize, toNumber} from "./Utils";
import {getPolicy} from "./Policy";

onmessage = function (e) {
    let data = e.data;
    let result;
    if (data.config.upgradeRecommend.mode===1){
        try {
            data.config.upgradeRecommend.value = Math.round(Number(data.config.upgradeRecommend.value));
        }catch (e) {
            data.config.upgradeRecommend.value = 100;
        }
        data.config.upgradeRecommend.value = Math.max(1,data.config.upgradeRecommend.value);
        data.config.upgradeRecommend.value = Math.min(9*2000,data.config.upgradeRecommend.value);
    }else {
        data.config.upgradeRecommend.value = toNumber(data.config.upgradeRecommend.value);
    }
    if (data.config.upgradeRecommend.mode===4){
        result = calculationType2(data.list,data.policy,data.buff,data.config);
    }
    else {
        result = calculationType1(data.list,data.policy,data.buff,data.config);
    }
    postMessage({
        mode:"result",
        result:result
    });
    postMessage("done");
};

let buildings = [
    new Chalet(),
    new SteelStructureHouse(),
    new Bungalow(),
    new SmallApartment(),
    new Residential(),
    new TalentApartment(),
    new GardenHouse(),
    new ChineseSmallBuilding(),
    new SkyVilla(),
    new RevivalMansion(),
    new ConvenienceStore(),
    new School(),
    new ClothingStore(),
    new HardwareStore(),
    new VegetableMarket(),
    new BookCity(),
    new BusinessCenter(),
    new GasStation(),
    new FolkFood(),
    new MediaVoice(),
    new WoodFactory(),
    new PaperMill(),
    new WaterPlant(),
    new PowerPlant(),
    new FoodFactory(),
    new SteelPlant(),
    new TextileMill(),
    new PartsFactory(),
    new TencentMachinery(),
    new PeoplesOil()
];
buildings.forEach((item)=>{
    item.initBuffs();
});

function getPrograms(list,config) {
    let programs = [];
    list.forEach(function (building) {
        let program = [];
        let sel = getFlagArrs(building.list.length,3);
        sel.forEach(function (val) {
            let p = [];
            val.forEach(function (v, index) {
                if (v===1){
                    let c = building.list[index];
                    buildings.forEach((item)=>{
                        if (item.BuildingName===c.name){
                            item.star = c.star;
                            if (!config.allBuildingLevel1){
                                item.level = c.level;
                            }else {
                                item.level = 1;
                            }
                            p.push(item);
                            return true;
                        }
                    });
                }
            });
            program.push(p);
        });
        programs.push(program);
    });
    return programs;
}

function getGlobalBuff(policy, buff, config) {
    //全局的buff
    let globalBuffs = new Buffs();
    //添加常规填写的buff（游记buff、城市任务普通buff、活动buff）
    buff.forEach(function (source) {
        source.list.forEach(function (buff) {
            globalBuffs.add(source.type,new Buff(buff.range,buff.target,buff.buff));
        });
    });
    //添加家国之光buff
    if (config.shineChinaBuff>0){
        globalBuffs.add(BuffSource.Policy,new Buff(BuffRange.Global,BuffRange.Global,config.shineChinaBuff));
    }
    config.questTargetBuff.forEach(target=>{
        if (target.building!=="" && target.buff>0){
            globalBuffs.add(BuffSource.Quest,new Buff(BuffRange.Targets,target.building,target.buff));
        }
    });
    //添加政策buff
    for (let i=1;i<=policy.step;i++){
        getPolicy(i).policys.forEach((p)=>{
            let level = 5;
            if (i===policy.step){
                policy.levels.forEach((l)=>{
                    if (p.title===l.title){
                        level = l.level;
                        return true;
                    }
                })
            }
            if (level===0){
                return;
            }
            // let b = p.buff(level)
            // console.log("政策：" + p.title + ",buff:" + b.target + ",加成：" + b.buff);
            globalBuffs.add(BuffSource.Policy,p.buff(level));
        })
    }
    return globalBuffs;
}

function calculationType1(list,policy,buff,config) {
    let programs = getPrograms(list,config);
    //需要结果：
    //1.在线金币最高
    //2.货物加成最高且在线金币最高
    //3.货物加成最高且橙色建筑最多且紫色建筑最多
    //4.离线金币最高

    let tempResult = {
        onlineMoney:{
            title:["在线金币优先策略"],
            money:0,
            addition:{}
        },
        supplyMoney:{
            title:["供货优先、金币次之策略"],
            supply:0,
            money:0,
            addition:{}
        },
        supplyRarity:{
            title:["供货优先、橙卡次之、紫卡再次之策略"],
            supply:0,
            legendary:0,
            rare:0,
            money:0,
            addition:{}
        },
        supplyLegendaryMoney:{
            title:["供货优先、橙卡次之、金币再次之策略"],
            supply:0,
            legendary:0,
            money:0,
            addition:{}
        },
        offlineMoney:{
            title:["离线金币优先策略"],
            money:0,
            addition:{}
        }
    };

    //全局的buff
    let globalBuffs = getGlobalBuff(policy,buff,config);

    let progressFull = programs[0].length;
    let currentProgress = 0;
    let progressTime = (new Date()).getTime();
    programs[0].forEach(function (val1,i1) {
        let tempProgress = Math.round((i1+1)/progressFull*100);
        let nowTime = (new Date()).getTime();
        if (tempProgress>currentProgress && nowTime-progressTime>=500){
            currentProgress = tempProgress;
            progressTime = nowTime;
            postMessage({
                mode:"progress",
                progress:currentProgress
            });
        }
        programs[1].forEach(function (val2) {
            programs[2].forEach(function (val3) {
                let temp = [...val1,...val2,...val3];
                let addition = {
                    online:0,
                    offline:0,
                    supply:0,
                    buildings:[],
                    toTps:0,
                    useMoney:0
                };

                let buffs = new Buffs();
                buffs.Policy = globalBuffs.Policy;
                buffs.Photo = globalBuffs.Photo;
                buffs.Quest = globalBuffs.Quest;

                let legendary = 0;
                let rare = 0;

                temp.forEach(function (t) {
                    if (t.rarity===BuildingRarity.Legendary){
                        legendary += 1;
                    }else if (t.rarity===BuildingRarity.Rare){
                        rare += 1;
                    }
                    buffs.addBuilding(t);
                });

                temp.forEach(function (t) {
                    let sumMultiple = t.sumMultiple(buffs);
                    let sumMoney = t.sumMoney(sumMultiple);
                    addition.online += sumMoney[BuffRange.Online];
                    addition.offline += sumMoney[BuffRange.Offline];
                    addition.buildings.push({
                        online:sumMoney[BuffRange.Online],
                        offline:sumMoney[BuffRange.Offline],
                        multiple:sumMultiple,
                        toLevel:t.level,
                        toOnline:sumMoney[BuffRange.Online],
                        tooltip:"",
                        building:t
                    });
                });
                addition.supply = Math.round(buffs.supplyBuff*100);
                addition.toTps = addition.online;

                let supply = addition.supply;
                if (config.supplyStep50){
                    supply = Math.floor(supply/50);
                }
                if (addition.online>tempResult.onlineMoney.money){
                    tempResult.onlineMoney.money = addition.online;
                    tempResult.onlineMoney.addition = addition;
                }
                if (addition.offline>tempResult.offlineMoney.money){
                    tempResult.offlineMoney.money = addition.offline;
                    tempResult.offlineMoney.addition = addition;
                }
                if (supply===tempResult.supplyMoney.supply){
                    if (addition.online>tempResult.supplyMoney.money){
                        tempResult.supplyMoney.money = addition.online;
                        tempResult.supplyMoney.supply = supply;
                        tempResult.supplyMoney.addition = addition;
                    }
                }else if (supply>tempResult.supplyMoney.supply){
                    tempResult.supplyMoney.money = addition.online;
                    tempResult.supplyMoney.supply = supply;
                    tempResult.supplyMoney.addition = addition;
                }
                if (supply===tempResult.supplyRarity.supply){
                    if (legendary===tempResult.supplyRarity.legendary){
                        if (rare===tempResult.supplyRarity.rare){
                            if (addition.online>tempResult.supplyRarity.money){
                                tempResult.supplyRarity.supply = supply;
                                tempResult.supplyRarity.legendary = legendary;
                                tempResult.supplyRarity.rare = rare;
                                tempResult.supplyRarity.addition = addition;
                                tempResult.supplyRarity.money = addition.online;
                            }
                        }else if (rare>tempResult.supplyRarity.rare){
                            tempResult.supplyRarity.supply = supply;
                            tempResult.supplyRarity.legendary = legendary;
                            tempResult.supplyRarity.rare = rare;
                            tempResult.supplyRarity.addition = addition;
                            tempResult.supplyRarity.money = addition.online;
                        }
                    }else if (legendary>tempResult.supplyRarity.legendary){
                        tempResult.supplyRarity.supply = supply;
                        tempResult.supplyRarity.legendary = legendary;
                        tempResult.supplyRarity.rare = rare;
                        tempResult.supplyRarity.addition = addition;
                        tempResult.supplyRarity.money = addition.online;
                    }
                }else if (supply>tempResult.supplyRarity.supply){
                    tempResult.supplyRarity.supply = supply;
                    tempResult.supplyRarity.legendary = legendary;
                    tempResult.supplyRarity.rare = rare;
                    tempResult.supplyRarity.addition = addition;
                    tempResult.supplyRarity.money = addition.online;
                }
                if (supply===tempResult.supplyLegendaryMoney.supply){
                    if (legendary===tempResult.supplyLegendaryMoney.legendary){
                        if (addition.online>tempResult.supplyLegendaryMoney.money){
                            tempResult.supplyLegendaryMoney.supply = supply;
                            tempResult.supplyLegendaryMoney.legendary = legendary;
                            tempResult.supplyLegendaryMoney.money = addition.online;
                            tempResult.supplyLegendaryMoney.addition = addition;
                        }
                    }else if (legendary>tempResult.supplyLegendaryMoney.legendary){
                        tempResult.supplyLegendaryMoney.supply = supply;
                        tempResult.supplyLegendaryMoney.legendary = legendary;
                        tempResult.supplyLegendaryMoney.money = addition.online;
                        tempResult.supplyLegendaryMoney.addition = addition;
                    }
                }else if (supply>tempResult.supplyLegendaryMoney.supply){
                    tempResult.supplyLegendaryMoney.supply = supply;
                    tempResult.supplyLegendaryMoney.legendary = legendary;
                    tempResult.supplyLegendaryMoney.money = addition.online;
                    tempResult.supplyLegendaryMoney.addition = addition;
                }
            });
        });
    });

    let result = [];
    Object.keys(tempResult).forEach((key)=>{
        //遍历返回结果集
        let r = tempResult[key];
        let arr1 = [];
        result.forEach((ar)=>{
            //将arr中的元素加入到临时arr
            arr1.push(ar.addition);
        });
        let index = arr1.indexOf(r.addition);
        if (index===-1){
            //如果结果集中的元素不在临时arr中，那就把该元素加入到arr
            result.push({
                title:r.title,
                addition:r.addition
            });
        }else {
            result.forEach((ar)=>{
                if (ar.addition===r.addition){
                    ar.title.push(r.title[0]);
                }
            });
        }
    });

    result.forEach(program=>{
        if (config.upgradeRecommend.mode===1){
            let count = 0;
            while (count<config.upgradeRecommend.value){
                //按优先度升级
                let u = upgrade(program.addition.buildings);
                if (u.addMoney===0){
                    break;
                }
                u.building.toOnline += u.addMoney;
                program.addition.toTps += u.addMoney;
                program.addition.useMoney += u.cost;
                count += 1;
            }
        }else if (config.upgradeRecommend.mode===2){
            let money = 0;
            while (money<config.upgradeRecommend.value){
                //按优先度升级，并返回消耗的金钱，并将money加上对应数值
                let u = upgrade(program.addition.buildings);
                if (u.addMoney===0){
                    break;
                }
                money += u.cost;
                if (money>config.upgradeRecommend.value){
                    u.building.toLevel -= 1;
                    break;
                }
                u.building.toOnline += u.addMoney;
                program.addition.toTps += u.addMoney;
                program.addition.useMoney += u.cost;
            }
        }else if (config.upgradeRecommend.mode===3){
            let tps = program.addition.online;
            while (tps<config.upgradeRecommend.value){
                //按优先度升级，并返回增加的tps，并将tps加上对应的数值
                let u = upgrade(program.addition.buildings);
                if (u.addMoney===0){
                    break;
                }
                tps += u.addMoney;
                u.building.toOnline += u.addMoney;
                program.addition.toTps += u.addMoney;
                program.addition.useMoney += u.cost;
            }
        }
        program.addition.buildings.forEach((building)=>{
            building.online = renderSize(building.online);
            building.offline = renderSize(building.offline);
            building.toOnline = renderSize(building.toOnline);
            if (building.toLevel===building.building.level){
                building.toLevel = "-";
            }else {
                building.tooltip = "该组合和当前buff下，该建筑升级到" + building.toLevel + "级时的在线收入为" + building.toOnline + "/秒";
            }
        });

        program.addition.toTps = renderSize(program.addition.toTps);
        program.addition.useMoney = renderSize(program.addition.useMoney);
        program.addition.online = renderSize(program.addition.online);
        program.addition.offline = renderSize(program.addition.offline);
    });

    return result;
}

function calculationType2(list,policy,buff,config) {
    let programs = getPrograms(list,config);

    let tempResult = {
        title:["在线金币优先策略"],
        money:0,
        addition:{}
    };
    let useMoney = -1;
    let bestTps = 0;

    //全局的buff
    let globalBuffs = getGlobalBuff(policy,buff,config);

    let progressFull = programs[0].length;
    let currentProgress = 0;
    let progressTime = (new Date()).getTime();
    programs[0].forEach(function (val1,i1) {
        let tempProgress = Math.round((i1+1)/progressFull*100);
        let nowTime = (new Date()).getTime();
        if (tempProgress>currentProgress && nowTime-progressTime>=500){
            currentProgress = tempProgress;
            progressTime = nowTime;
            postMessage({
                mode:"progress",
                progress:currentProgress
            });
        }
        programs[1].forEach(function (val2) {
            programs[2].forEach(function (val3) {
                let temp = [...val1,...val2,...val3];
                let addition = {
                    online:0,
                    offline:0,
                    supply:0,
                    buildings:[],
                    toTps:0,
                    useMoney:0
                };

                let buffs = new Buffs();
                buffs.Policy = globalBuffs.Policy;
                buffs.Photo = globalBuffs.Photo;
                buffs.Quest = globalBuffs.Quest;

                temp.forEach(function (t) {
                    buffs.addBuilding(t);
                });

                temp.forEach(function (t) {
                    let sumMultiple = t.sumMultiple(buffs);
                    let sumMoney = t.sumMoney(sumMultiple);
                    addition.online += sumMoney[BuffRange.Online];
                    addition.offline += sumMoney[BuffRange.Offline];
                    addition.buildings.push({
                        online:sumMoney[BuffRange.Online],
                        offline:sumMoney[BuffRange.Offline],
                        multiple:sumMultiple,
                        toLevel:t.level,
                        toOnline:sumMoney[BuffRange.Online],
                        tooltip:"",
                        building:t
                    });
                });
                addition.supply = Math.round(buffs.supplyBuff*100);
                addition.toTps = addition.online;

                let tps = addition.online;
                while (tps<config.upgradeRecommend.value){
                    //按优先度升级，并返回增加的tps，并将tps加上对应的数值
                    let u = upgrade(addition.buildings);
                    if (u.addMoney===0){
                        break;
                    }
                    tps += u.addMoney;
                    u.building.toOnline += u.addMoney;
                    addition.toTps += u.addMoney;
                    addition.useMoney += u.cost;
                }
                if (useMoney===addition.useMoney){
                    if (bestTps<tps){
                        useMoney = addition.useMoney;
                        bestTps = tps;
                        tempResult.money = addition.online;
                        tempResult.addition = addition;
                    }
                }else if (useMoney===-1 || addition.useMoney<useMoney){
                    useMoney = addition.useMoney;
                    bestTps = tps;
                    tempResult.money = addition.online;
                    tempResult.addition = addition;
                }
            });
        });
    });

    tempResult.addition.buildings.forEach((building)=>{
        building.online = renderSize(building.online);
        building.offline = renderSize(building.offline);
        building.toOnline = renderSize(building.toOnline);
        if (building.toLevel===building.building.level){
            building.toLevel = "-";
        }else {
            building.tooltip = "该组合和当前buff下，该建筑升级到" + building.toLevel + "级时的在线收入为" + building.toOnline + "/秒";
        }
    });

    tempResult.addition.toTps = renderSize(tempResult.addition.toTps);
    tempResult.addition.useMoney = renderSize(tempResult.addition.useMoney);
    tempResult.addition.online = renderSize(tempResult.addition.online);
    tempResult.addition.offline = renderSize(tempResult.addition.offline);

    return [tempResult];
}

function upgrade(buildings) {
    let benefit = 0;
    let building;
    let levelData;
    buildings.forEach(b=>{
        if (b.toLevel>=2000){
            return;
        }
        let ld = getData(b.toLevel,b.building.rarity);
        let ben = ld.benefit * b.multiple[BuffRange.Online];
        if (ben > benefit){
            benefit = ben;
            building = b;
            levelData = ld;
        }
    });
    if (benefit>0 && building && levelData){
        building.toLevel += 1;
        return {
            addMoney:levelData.addMoney * building.multiple[BuffRange.Online],
            cost:levelData.cost,
            building:building
        }
    }else {
        return {
            addMoney:0,
            cost:0,
            building:null
        }
    }
}

// function upgradeBenefit(online,building,buffs) {
//     if (building.level<2000){
//         building.level += 1;
//     }else {
//         return {
//             online: online,
//             benefit: 0
//         };
//     }
//     let cost = getCost(building.level,building.rarity);
//
//     let addition = building.calculation(buffs);
//     let addOnline = addition[BuffRange.Online] - online;
//     if (addOnline===0){
//         return {
//             online: addition[BuffRange.Online],
//             benefit: 0
//         };
//     }
//     return {
//         online:addition[BuffRange.Online],
//         benefit:addOnline/cost
//     };
// }